# TODO: create a decoding function that uses a KV cache past_key_values 

import torch 

def generate_one_token_at_a_time(self, input_tokens):
    input_ids = input_tokens["input_ids"].to("cuda" if torch.cuda.is_available() else "cpu")
    past = None
    for i in range(50):  # Change this to control the number of tokens generated, set to max per user spec 
        with torch.no_grad():
            outputs = self.model(input_ids, past_key_values=past)
        token = outputs.logits[:, -1, :].argmax(dim=-1)
        yield self.decode(token)
        input_ids = token.unsqueeze(0)
        past = outputs.past_key_values