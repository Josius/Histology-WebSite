#!/bin/bash

echo -e "\nInstalling dependencies and initializing Flask app\n"
if [ ! -d "/envhist/" ]; then
  echo 'creating python virtual environment'
  python3 -m venv envhist
fi
source envhist/bin/activate
yes | pip3 install -r requirements.txt
export FLASK_APP=backend.py
export FLASK_ENV=development
flask run
