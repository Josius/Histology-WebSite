from flask import Flask, render_template, session, redirect, url_for, request
from configparser import SafeConfigParser
from db import db_session
import models
import datetime
import forms

backend = Flask(__name__)

current_year = str(datetime.date.today())[0:4]

parser = SafeConfigParser()
parser.read('conf.cfg')
current_version = parser.get('version', 'current_version')
backend.config['SECRET_KEY'] = parser.get('flask parameters', 'secret_key')
backend.config['DEBUG MODE'] = parser.get('flask parameters', 'debug_mode')


@backend.route('/')
def index():
    return render_template('home.html', page_name='Home', current_year=current_year,
                           version=current_version)


@backend.route('/browse')
def browse():
    return render_template('browse.html', page_name='Navegar', current_year=current_year,
                           version=current_version)


@backend.route('/contribute', methods=['GET', 'POST'])
def contribute():
    page_name = 'Contribua'
    try:
        if session['user_email']:
            return redirect(url_for('dashboard'))

    except KeyError:
        pass

    login_form = forms.LoginForm()
    sign_up_form = forms.SignUpForm()

    return render_template('contribute.html', page_name=page_name, current_year=current_year,
                           version=current_version, login_form=login_form, sign_up_form=sign_up_form)


@backend.route('/signup', methods=['GET', 'POST'])
def signup():
    sign_up_form = forms.SignUpForm()

    if sign_up_form.validate():
        if None in (sign_up_form.email.data, sign_up_form.name.data, sign_up_form.password.data,
                    sign_up_form.surname.data, sign_up_form.password2):
            return 'Por favor preencha todos os campos do formulário de cadastro'
        else:
            if sign_up_form.password.data != sign_up_form.password2.data:
                return 'as senhas não são iguais'
            elif len(sign_up_form.password.data) < 6:
                return 'a senha precisa de pelo menos 6 caracteres'
            session['user_email'] = sign_up_form.email.data
            new_user = models.User(email=sign_up_form.email.data,
                                   first_name=sign_up_form.name.data,
                                   surname=sign_up_form.surname.data,
                                   password=sign_up_form.password.data)
            db_session.add(new_user)
            db_session.commit()
            return redirect(url_for('dashboard'))
    else:
        return 'Por favor preencha todos os campos do formulário de cadastro'


@backend.route('/login', methods=['GET', 'POST'])
def login():
    login_form = forms.LoginForm()

    if None in (login_form.email.data, login_form.password.data):
        if login_form.email.data is None:
            return 'Preencha o email'
        if login_form.password.data is None:
            return 'Preencha a senha'
    else:
        try:
            user = db_session.query(models.User).get(login_form.email.data)
            if user.password == login_form.password.data:
                session['user_email'] = user.email
                return redirect(url_for('dashboard'))
        except AttributeError:
            return 'Email não cadastrado'
    return 'Senha incorreta'


@backend.route('/dashboard', methods=['GET', 'POST'], defaults={'edit_mode': False})
def dashboard(edit_mode):
    page_name = 'Dashboard'
    if request.form.get('logoff') == 'Logoff':
        session['user_email'] = None
    if session['user_email'] is None:
        return redirect(url_for('contribute'))
    else:
        user = db_session.query(models.User).get(session['user_email'])
        if request.form.get('edit_user_data') == 'Editar Informações':
            edit_mode = True
        if request.form.get('update') == 'Atualizar':
            user.first_name = request.form.get('first_name')
            user.surname = request.form.get('surname')
            user.birth_date = request.form.get('birth_date')
            user.bio = request.form.get('bio')
            db_session.commit()
            user = db_session.query(models.User).get(session['user_email'])
        return render_template('dashboard.html', page_name=page_name, current_year=current_year,
                               version=current_version, user=user, display_constructor=forms.UserData,
                               edit_mode=edit_mode)


@backend.route('/help')
def help():
    help_form = forms.HelpForm()
    page_name = 'Ajuda'
    return render_template('help.html', page_name=page_name, current_year=current_year,
                           version=current_version, help_form=help_form)


if __name__ == '__main__':
    backend.run()
