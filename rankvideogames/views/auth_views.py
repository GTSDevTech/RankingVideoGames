from django.contrib.auth import authenticate, login, logout
from django.shortcuts import redirect, render
from rankvideogames.forms import LoginForm, RegisterForm

def auth_view(request):
    mode = request.POST.get("mode") or request.GET.get("mode") or "login"

    login_form = LoginForm(request, data=request.POST or None)
    register_form = RegisterForm(request.POST or None)

    if request.method == "POST":
        if mode == "login":
            if login_form.is_valid():
                username = login_form.cleaned_data.get("username")
                password = login_form.cleaned_data.get("password")
                user = authenticate(request, username=username, password=password)
                if user is not None:
                    login(request, user)
                    if user.role == 2:
                        return redirect("go_home")
                    else:
                        return redirect("go_data")

                login_form.add_error(None, "Usuario o contraseña incorrectos.")

        elif mode == "register":
            if register_form.is_valid():
                register_form.save()
                return redirect("go_login")

    return render(request, "login.html", {
        "mode": mode,
        "login_form": login_form,
        "register_form": register_form,
    })
    
def logout_user(request):
    logout(request)
    return redirect("go_login")

