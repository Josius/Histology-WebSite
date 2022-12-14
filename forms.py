from wsgiref.validate import validator
from flask_wtf import FlaskForm
from flask_wtf.file import FileRequired, FileAllowed
from wtforms import StringField, PasswordField, DateField, FieldList, IntegerField, FileField, HiddenField, SubmitField
from wtforms.validators import Length, ValidationError, DataRequired
from datetime import date


class SearchForm(FlaskForm):
    searched = StringField('')

class LoginForm(FlaskForm):
    email = StringField(label="Email", validators=[Length(max=320)], render_kw={'maxlength': 320, "placeholder": "digite seu email"})
    password = PasswordField(label="Senha", validators=[Length(min=6, max=32)],
                             render_kw={'maxlength': 32, "placeholder": "digite sua senha"})


class SignUpForm(FlaskForm):
    name = StringField(label='Nome', validators=[Length(max=120)], render_kw={'maxlength': 120, "placeholder": "nome"})
    surname = StringField(label='Sobrenome', validators=[Length(max=120)], render_kw={'maxlength': 120, "placeholder": "sobrenome"})
    email = StringField(label='Email', validators=[Length(max=320)], render_kw={'maxlength': 320, "placeholder": "email"})
    password = PasswordField(label='Senha', validators=[Length(min=6, max=32)],
                             render_kw={'maxlength': 32, "placeholder": "senha"})
    password2 = PasswordField(label='Repita a senha', validators=[Length(min=6, max=32)],
                              render_kw={'maxlength': 32, "placeholder": "repita sua senha"})


class HelpForm(FlaskForm):
    full_name = StringField(label='Nome Completo', render_kw={'maxlength': 120, "placeholder": "Nome Completo"})
    email = StringField(label='Email', validators=[Length(min=8, max=320)],
                        render_kw={'maxlength': 320, "placeholder": "email"})
    help_text = StringField(label='Texto', validators=[Length(min=100, max=1000)],
                            render_kw={'maxlength': 1000, 'class': 'large_text_input', "placeholder": "Texto"})


class UserData(FlaskForm):
    first_name = StringField(label='Nome', render_kw={}, validators=[Length(max=120)])
    surname = StringField(label='Sobrenome', render_kw={}, validators=[Length(max=120)])
    birth_date = DateField(label='Data de nascimento', render_kw={'type': 'date'})
    bio = StringField(label='Biografia', render_kw={},
                      validators=[Length(min=100, max=1000)])

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


class AddSlideForm(FlaskForm):
    name = StringField(label='Nome da L??mina', validators=[Length(max=120)],
                       render_kw={'maxlength': 120})
    species = StringField(label='Esp??cie', validators=[Length(max=120)],
                          render_kw={'maxlength': 120})
    scan_date = DateField(label='Data de escaneamento', render_kw={'type': 'date'})
    image_file = FileField(label='Inserir Arquivo', validators=[FileRequired(),
                                                                FileAllowed(['tiff', 'tif', 'zif', 'svs'],
                                                                            message='Wrong file '
                                                                                    'extension')])

    def validate_on_submit(self):
        result = super(AddSlideForm, self).validate()
        if self.scan_date.data > date.today():
            self.scan_date.errors.append({'Invalid date': self.scan_date.data.__str__()})
            return False
        else:
            return result


class AddSlideMarker(FlaskForm):
    title = StringField(label='T??tulo', validators=[Length(max=120)], render_kw={'maxlength': 120})
    coordinates = FieldList(IntegerField, max_entries=2, label='Coordenadas')
    text = StringField(label='Texto', validators=[Length(max=2000)], render_kw={'maxlength': 2000})

class ArqImgForm(FlaskForm):
    arq_nome = HiddenField("arq_nome")