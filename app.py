from flask import Flask, render_template

from test_a import v1_bp
from test_b import v2_bp

app = Flask(__name__)

# Register the two DSL versions as blueprints.
#   V1 -> formerly DSL_1 (Real-Time Task Orchestration DSL)  served under /v1
#   V2 -> formerly DSL   (Service-Oriented Aerospace DSL)     served under /v2
app.register_blueprint(v1_bp)
app.register_blueprint(v2_bp)


@app.route('/')
def landing():
    """Landing page: choose the DSL version (V1 or V2)."""
    return render_template('landing.html')


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
