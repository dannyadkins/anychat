from flask import Flask, request, Response, jsonify
from generate import generate_texts

app = Flask(__name__)

def generate_stream(model_name, input_texts):
    generated_texts = generate_texts(model_name, input_texts)
    for text in generated_texts:
        yield f"data: {text}\n\n"

@app.route('/generate', methods=['POST'])
def generate():
    model_name = request.json['model_name']
    input_texts = request.json['input_texts']

    try:
        return Response(generate_stream(model_name, input_texts), content_type='text/event-stream')
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, threaded=True)
