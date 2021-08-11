#!/bin/bash

echo -e "\nInstalling dependencies and initializing Flask app\n"
if [ ! -d "/envhist/" ]; then
  echo 'creating python virtual environment'
  python3 -m venv envhist
fi
source envhist/bin/activate
pip3 install waitress
yes | pip3 install -r requirements.txt
pip3 install dist/backend-0.0-py3-none-any.whl
export FLASK_APP=backend
export FLASK_ENV=production
waitress-serve --call 'backend:create_app'
