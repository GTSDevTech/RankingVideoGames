from django import forms
from django.contrib.auth.forms import AuthenticationForm
from rankvideogames.models import *


class RegisterForm(forms.ModelForm):
    GENDERS = (
        ('M', 'Masculino'),
        ('F', 'Femenino'),
    )
    gender = forms.ChoiceField(choices=GENDERS, required=True)
    password = forms.CharField(widget=forms.PasswordInput)
    repeat_password = forms.CharField(widget=forms.PasswordInput)

    class Meta:
        model = Usuario
        fields = ("username", "email", "gender")


    def clean(self):
        cleaned = super().clean()
        u1 = cleaned.get("username")
        u2 = cleaned.get("email")
        p1 = cleaned.get("password")
        p2 = cleaned.get("repeat_password")
        if(p1 and p2 and p1!=p2):
            self.add_error("Inténtalo de nuevo","Las contraseñas no coinciden.")
            return cleaned
        
    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        user.role = 2
        user.gender = self.cleaned_data.get("gender")
        if commit:
            user.save()
        return user

class LoginForm(AuthenticationForm):
    username = forms.CharField(label="Username")