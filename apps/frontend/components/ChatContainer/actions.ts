"use server";

import { revalidateTag } from "next/cache";

export async function sendMessage() {
  console.log("Sending message");
  // fetch POST the /conversations endpoint
  const res = await fetch("http://localhost:3000/api/conversations", {
    method: "POST",
    body: JSON.stringify({
      name: "New conversation",
    }),
    cache: "no-store",
  })
    .then((res) => res.json())
    .catch((err) => console.error(err));

  console.log("Received...", res);
  revalidateTag("conversations");
}
