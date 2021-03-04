#!/bin/bash

echo -e "Starting \"envhist\" virtual environment and Flask variables \n"
export FLASK_APP=backend.py
export FLASK_DEBUG=1
bash --rcfile "./envhist/bin/activate" -i

