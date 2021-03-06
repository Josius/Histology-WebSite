from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, DateField
from wtforms.validators import Length


class LoginForm(FlaskForm):
    email = StringField(label="Email", validators=[Length(max=320)], render_kw={'maxlength': 320})
    password = PasswordField(label="Senha", validators=[Length(min=6, max=32)],
                             render_kw={'maxlength': 32})


class SignUpForm(FlaskForm):
    name = StringField(label='Nome', render_kw={'maxlength': 120})
    surname = StringField(label='Sobrenome', render_kw={'maxlength': 120})
    email = StringField(label='Email', validators=[Length(max=320)], render_kw={'maxlength': 320})
    password = PasswordField(label='Senha', validators=[Length(min=6, max=32)],
                             render_kw={'maxlength': 32})
    password2 = PasswordField(label='Repita a senha', validators=[Length(min=6, max=32)],
                              render_kw={'maxlength': 32})


class HelpForm(FlaskForm):
    full_name = StringField(label='Nome Completo', render_kw={'maxlength': 120})
    email = StringField(label='Email', validators=[Length(min=8, max=320)],
                        render_kw={'maxlength': 320})
    text = StringField(label='Texto', id='help_text', validators=[Length(min=100, max=1000)],
                       render_kw={'maxlength': 1000})


class UserData(FlaskForm):
    first_name = StringField(label='Nome', render_kw={})
    surname = StringField(label='Sobrenome', render_kw={})
    birth_date = DateField(label='Data de nascimento', render_kw={'type': 'date'})
    bio = StringField(label='Biografia', render_kw={})

    def __init__(self, values: dict, readonly: bool = True, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if readonly:
            self.first_name.render_kw['readonly'] = True
            self.surname.render_kw['readonly'] = True
            self.birth_date.render_kw['readonly'] = True
            self.bio.render_kw['readonly'] = True
        else:
            self.first_name.render_kw['readonly'] = False
            self.surname.render_kw['readonly'] = False
            self.birth_date.render_kw['readonly'] = False
            self.bio.render_kw['readonly'] = False
        self.first_name.render_kw['value'] = values['first_name']
        self.surname.render_kw['value'] = values['surname']
        self.birth_date.render_kw['value'] = values['birth_date']
        self.bio.render_kw['value'] = values['bio']
        if values['birth_date'] is None:
            self.birth_date.render_kw.pop('value')
            self.birth_date.render_kw['placeholder'] = 'dd/mm/aaaa'
        if values['bio'] is None:
            self.bio.render_kw['value'] = ''
