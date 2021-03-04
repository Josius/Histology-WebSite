from flask import Flask, render_template
from configparser import SafeConfigParser
import datetime
import forms

backend = Flask(__name__)

current_year = str(datetime.date.today())[0:4]

parser = SafeConfigParser()
parser.read('conf.cfg')
current_version = parser.get('version', 'current_version')
backend.config['SECRET_KEY'] = parser.get('flask parameters', 'secret_key')


@backend.route('/')
def index():
    page_name = 'Home'
    return render_template('home.html', page_name='Home', current_year=current_year,
                           version=current_version)


@backend.route('/browse')
def browse():
    page_name = 'Navegar'
    return render_template('browse.html', page_name=page_name, current_year=current_year,
                           version=current_version)


@backend.route('/contribute', methods=['GET', 'POST'])
def contribute():

    login_form = forms.LoginForm()
    sign_up_form = forms.SignUpForm()
    page_name = 'Contribua'
    if login_form.validate_on_submit():
        return f'email: {login_form.email.data} | password: {login_form.password.data}'

    return render_template('contribute.html', page_name=page_name, current_year=current_year,
                           login_form=login_form, sign_up_form=sign_up_form, version=current_version)


@backend.route('/dashboard', methods=['GET', 'POST'])
def dashboard():
    login_form = forms.LoginForm()
    sign_up_form = forms.SignUpForm
    page_name = 'Contribua'
    if login_form.validate_on_submit():
        return f'email: {login_form.email.data} | password: {login_form.password.data}'
    else:
        return render_template('contribute.html', page_name=page_name, current_year=current_year,
                               login_form=login_form, sign_up_form=sign_up_form, version=current_version)


@backend.route('/help')
def help():
    help_form = forms.HelpForm()
    page_name = 'Ajuda'
    return render_template('help.html', page_name=page_name, current_year=current_year,
                           version=current_version, help_form=help_form)


if __name__ == '__main__':
    backend.run()
