from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField
from wtforms.validators import Length


class LoginForm(FlaskForm):
    email = StringField(label="Email")
    password = PasswordField(label="Senha")


class SignUpForm(FlaskForm):
    name = StringField(label='Nome')
    surname = StringField(label='Sobrenome')
    email = StringField(label='Email', validators=[Length(max=320)])
    password = PasswordField(label='Senha')
    password2 = PasswordField(label='Repita a senha')


class HelpForm(FlaskForm):
    full_name = StringField(label='Nome Completo')
    email = StringField(label='Email', validators=[Length(min=8, max=320)])
    text = StringField(label='Texto',id='help_text', validators=[Length(min=100, max=1000)])
