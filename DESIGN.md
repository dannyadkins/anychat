This is a design spec for a clone of ChatGPT.

# Overview

## Functional requirements

Core:

- [x] Messages grouped into conversations
- [x] Edit messages & branch conversations
- [x] Stream back responses to user

Nice-to-haves:

- [ ] Allow user to refresh and not interrupt
- [ ] Pagination for really long conversations (>100KB)
- [ ] Abort responses
- [ ] Regenerate responses
- [ ] Load testing

Nonfunctional:

- [ ] Very fast
- [ ] 10M+ users, ~10,000 messages per user

## Data model

My proposed data model is to have a `conversations` table that stores metadata (e.g. convo name), and a `messages` table that stores the actual messages.

Each message should have a parentId, so we know where the conversation branches.

One major problem is pagination. ChatGPT just suboptimally fetches all messages right now.

Furthermore, we need to be able to receive the most recent messages for a conversation. Two options: use a timestamp, or use the depth of the node.

Options:

1. Each message has a parentId corresponding to the previous message.

- Cons:

  - doesn't handle parallel messages, e.g. if I have 5 messages from different branches but no joint parent, which ones do I show? To fix, I would have to keep sending requests for parents, which would be extremely slow.

2. Each message has a parentId corresponding to where the branching occurred.

- Critical flaw:
  - when you create a branch on an otherwise unbranched thread, you have to let all the messages in that thread know that they now are part of a branch. Basically, all messages that come after X (the fork) need to now have parentId=forkMessageId. That's a second request, which makes it slower (but can be done async?).

3. Always show from the original branch first (fetch most recent X messages where parentId=null)

- Cons:
  - if a different branch is fresher or longer, it still doesn't get shown. Bad UX.
  - data is a bit weird: e.g. main branch messages don't have a parentId but branched ones do
  - if you toggle to a different branch, it will have to load the whole branch down to the leaf. This seems expected, it just might be bad if the branch is massive.

I chose `Approach #3`. If the user wants to keep the UI state by seeing the branch they're currently on, this can just be cached locally for them. Otherwise, loading the original branch seems natural. This is currently implemented in `ChatContainer` and `useChat`. It works great!

# API

### GET /conversations: all conversations for a user

Infinite scroll:

- use cursor pagination. If the user is scrolling, we want them to be able to get more conversations, and we want to dynamically choose how many more to fetch based on their scroll speed (e.g. if they are scrolling extremely fast, give them 100, otherwise give them 10). This wouldn't be possible with offset pagination, since Cursor pagination is less load on the DB as well, since offset means the DB still has to traverse the records its skipping.

Ideally, we cache this and invalidate whenever a user starts a new chat. Caching is perfect here because we know exactly when we want to invalidate the cache, and the user will read the conversation list much more than they'll invalidate it.

### POST /conversations/[conversationId]: send a message, receive the response

This service takes a user's message, loads some history (e.g. 5 most recent messages), and calls the model inference service (see below; we start with OpenAI ChatGPT but goal is to have a custom model served).

The core question is how to stream back tokens and save them to the DB in a manner that provides the best UX. By "best UX", I mean fastest and also doesn't break the model's response on disconnect (like ChatGPT does). 

I chose `server-sent events` because they are (a tiny bit) faster than WebSockets, easy way to provide realtime updates, and the connection is basically unidirectional (chatbot just responding to user). WebSockets would make sense if the user was sending more realtime data and the connection was more bidirectional. 

For the response logic, here are the competing solutions:

1. Naive approach A: Save every token that is generated to the DB directly, and user keeps reading from DB using polling.
- Critical flaw: way way way too many writes and reads, obviously not smart.

2. Naive approach B: Stream every token back to the client, and only save to DB when the stream is done.
- Critical flaw: if the client disconnects, or the stream is otherwise interrupted, all tokens will be lost. This happens on real ChatGPT (try refreshing mid-message), and it is infuriating :)

3. Save to DB after full message. If the user disconnects, start putting response tokens in Redis. If they reconnect or request, pull from Redis for most recent.

- Cons:
  - It is unclear how to start re-streaming the new tokens back to the user.
  - If the connection between this service and the model inference service is interrupted, the whole response is moot.
  - Added bit of complexity 

4. Model inference service saves tokens to Redis directly, using a key for the conversation ID. When the user wants to see response, just read from Redis.

- Cons:
  - TINY BIT slower because we have Redis as a new middle layer, on the order of 10ms.
  - A ton of load on Redis, much unnecessary.

- Pros:
  - Robust: Ensures all tokens eventually get seen by the user, even if disconnections happen
  - Logic for streaming back is also reusable for the GET /conversations/[conversationId]/current
  - Also allows us to easily stop the user from sending multiple messages in a row (if there are tokens in Redis, return an error)

I settled on `Approach #3`, but need to migrate away from Next API routes first, as they provide no way to tell if a disconnection occurs like in other API frameworks. I'm planning on moving to Express or maybe Flask.

The user sends a request, the API sends a POST to the model, and if the user disconnects, model saves tokens directly to Redis. When the user reconnects, the API then reads from Redis and streams back tokens until they are done (either an interval, or a stop token). Once they are done, it saves to database.

I chose `Vercel KV` out of ease, but one downside is that it doesn't support Redis Streams, which would be best for this use case. This task is best suited for a more traditional message queue.

### GET /conversations/[conversationId]/history: get the history of a chat

Will paginate in future. Once I do, it will use the structure described above: load the leftmost branch first. 

### GET /conversations/[conversationId]/current: get the current streaming response for a chat

Uses the same functionality as the POST /conversations/[conversationId] handler.

### Middleware

userId should be extracted from the headers.

Load balancing and autoscaling is being done by Vercel right now, but want to switch to ECS + Elastic Load Balancing. 

### Implementation details:

- [x] Start with Naive Approach B from the chat API
- [ ] Paginate the conversation history
- [ ] Middleware for authentication
- [ ] Hosted on AWS, deployed with Terraform
- [ ] Load balancer and autoscaler on AWS

# Database

### ORM

I wanted to create a universal interface to work with our database, which includes shard logic, instead of forcing each client/app to handle everything themselves.

I chose `Prisma` ORM to create a generic TypeScript client for our databases.

The benefits include easier migrations, ability to keep the DB schema synced with the code (`prisma db push` works kind of like `terraform apply`), and most importantly, we can abstract sharding and any other shared logic (e.g. special queries) to be only written in one place. Major downside is that it currently doesn't work in the edge runtime, and also need a different ORM alongside it if we end up having pieces of backend in Python (but we can programatically synchronize them).

### Sharding

The shard key is the userId. This is clearly the right choice: users only need to fetch their own data, they often want to fetch all or most of their data so it shouldn't be split up, and each individual user does not have enough data that it would have to be split up across nodes. This means that popular queries like "get messages" and "get conversations" can interact with exactly 1 shard and will have all the requesite data. 

I shard across 2 Postgres instances for example, but can grow to many more.

I chose simple mod-based sharding, but consistent hashing would be ideal. Mod-based sharding has the problem that if we want to grow the number of nodes, or if a node goes offline, it won't work anymore (if we increase the modulus, old data will be in the wrong place).

### Indexes

We have two common queries:

- get all conversations for a userId
- get all messages for a conversationId

So, we can easily put an index on `conversations` for `userId`, and `messages` for `conversationId`. This is defined in the Prisma schema.

### Implementation

- [x] Basic universal sharded ORM
- [x] Automated scripts for DB schema sycing (turbo db:sync)
- [x] Naive mod sharding on userId
- [ ] Upgrade to consistent hashing
- [ ] Add indexes

# Frontend

## Requirements

Core functional requirements:

- [x] Create a new conversation
- [x] Send a message, get response
- [x] Edit a message and branch threads
- [ ] Can't send message if chatbot currently responding

Nice-to-haves:

- [ ] Virtualized list for really long conversations
- [ ] User can refresh and the chat response is still streamed back to them
- [ ] Infinite scroll for really long conversations
- [ ] Search
- [ ] Accessible
- [ ] Responsive
- [ ] Animations
- [ ] Eager updates & instant feedback
- [ ] Dark/light mode

Ignoring:

- [ ] i18n (unclear whether we should have different models or translate the model response)

## Implementation

### Architecture

I chose `NextJS` because of the flexibility of the routing and layout system, as well as the ability to easily build a static cache of assets and implement server-side rendering for components that are not necessary by the client.

We server-side render everything that is non-interactive to the client (which isn't very much), and client-side render everything else. Benefits of SSR are faster time-to-meaningful-paint and lower bundle size for the user, but downsides include more load on the server and slower time-to-first-paint (while the server loads the JS). For example, `<ChatContainer/>` is CSR.

### Frontend data

For fetching conversation list, I chose to do this on the server. The benefit is that it can be a lot of data and HTML, and the server can do this quickly and get a fast time-to-meaningful-paint for the user. The downside is that it's a heavier load on the server. Furthermore, it makes for an easy caching experience, especially with NextJS: we always know exactly when a new conversation is created, so we can manually trigger revalidations, and never risk stale data.

For fetching chat history, I chose `SWR`. This allows the user to jump between chat windows without having to wait to see chat data, by storing the response data in the global SWR cache. We can easily mutate the SWR cache when we receive new tokens. 

I'm exploring using `IndexedDB` to store the SWR cache, so that different browser windows can have synchronized data. It adds a bit of complexity. 

# Model inference

Server for any model on huggingface, that streams back results.

Nvidia's Triton Inference Server is the most production-grade product out there, but I wanted to try to implement from scratch.

Still learning here on how to make responses as fast as possible.

Implementing:

- [ ] KV cache using HuggingFace's past_key_values and a Flask LRUCache
- [ ]

# Model inference

Still learning here. Implementing:

- [ ] KV cache using HuggingFace's past_key_values and a Flask LRUCache
- [ ]

# Learnings after implementing

There's a tremendous amount of detail in synchronizing database state and local state. For example, we want to eagerly update UI with branched conversations, so we have some duplicated logic for deriving root IDs and parent IDs.

I would have offloaded much more of the conversation management logic to the server.
For example, we pass in the history of messages from the frontend to the API.
The alternative would be to load the history of messages in the API itself. This would be slightly slower, but it would enable far more flexibility to do things like "find the 10 messages with the highest cosine similarity" that can't be done readily on the client, as well as less complexity over time.

The algorithm design for forking/editing old messages can be much improved in terms of space (for example, not duplicating messagesBeforeThis for every single message to know the history before it). I think that algo runtime can also be improved.
