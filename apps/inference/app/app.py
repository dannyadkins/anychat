from flask import Flask, request, Response
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch
import json

app = Flask(__name__)

@app.route('/generate', methods=['POST'])
def generate():
    # Get the input data from the request
    data = request.json
    # texts = data.get('texts', [])

    # Process the batch of texts
    # outputs = process_batch(texts)
    # tokens = outputs.logits.argmax(dim=-1).tolist()

    # Convert the tokens to text
    texts_out = ["hey hey", "number 2", "seven", "86", "fun"]

    # Create a response by streaming the texts
    def generate_response():
        for text in texts_out:
            yield text + "\n"

    return Response(generate_response(), content_type='text/plain')

if __name__ == '__main__':
    app.run(debug=True)
