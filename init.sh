#!/bin/bash

echo -e "Starting \"envhist\" virtual environment and Flask variables \n"
export FLASK_APP=backend.py
export FLASK_ENV=development
flask run