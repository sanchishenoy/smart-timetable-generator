from flask import Flask
from flask_cors import CORS
from routes.subjects import subjects_bp
from routes.teachers import teachers_bp
from routes.classes import classes_bp
from routes.rooms import rooms_bp
from routes.timetable import timetable_bp

app = Flask(__name__)
CORS(app)  # Allow React frontend to call this API

# Register route blueprints
app.register_blueprint(subjects_bp,  url_prefix="/api/subjects")
app.register_blueprint(teachers_bp,  url_prefix="/api/teachers")
app.register_blueprint(classes_bp,   url_prefix="/api/classes")
app.register_blueprint(rooms_bp,     url_prefix="/api/rooms")
app.register_blueprint(timetable_bp, url_prefix="/api/timetable")

if __name__ == "__main__":
    app.run(debug=True, port=5000)