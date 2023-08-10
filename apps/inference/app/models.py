from transformers import AutoModelForCausalLM, AutoTokenizer

class ModelWrapper:
    def __init__(self, model_name):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(model_name)
    
    def tokenize(self, text):
        return self.tokenizer(text, return_tensors="pt")
    
    def decode(self, tokens):
        return self.tokenizer.decode(tokens[0], skip_special_tokens=True)

# TODO: make sure kv cache is used with use_cache flag 