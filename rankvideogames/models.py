from django.contrib.auth.base_user import BaseUserManager, AbstractBaseUser
from django.contrib.auth.models import PermissionsMixin
from django_mongodb_backend.fields import ArrayField
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone


# Create your models here.
class UsuarioManager(BaseUserManager):
    def create_user(self, email, username, role, password=None):
        if not email or not username or not role:
            raise ValueError('Users must have an email address and username')
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, role=role)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, nombre, rol='admin', password=None):
        usuario = self.create_user(email, nombre, rol, password)
        usuario.is_superuser = True
        usuario.is_staff = True
        usuario.save(using=self._db)
        return usuario

class Usuario(AbstractBaseUser, PermissionsMixin):
    ROLES = (
        (1, 'Admin'),
        (2, 'Client')
    )

    mail = models.EmailField(max_length=255, null=False, unique=True)
    username = models.CharField(max_length=255, null=False, unique=True)
    role = models.IntegerField(choices=ROLES, null=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UsuarioManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'role']

    def __str__(self):
        return self.username




class VideoGame(models.Model):
    code = models.IntegerField(null=False)
    title = models.CharField(max_length=255, null=False)
    slug = models.SlugField(max_length=255, null=False)
    first_release_date = models.DateField(null=False)
    platform = models.CharField(max_length=255, null=False)
    genre = models.CharField(max_length=255, null=False)
    developer = models.CharField(max_length=255, null=False)
    publisher = models.CharField(max_length=255, null=False)
    total_rating = models.IntegerField(null=False)
    rating_count = models.IntegerField(null=False)
    cover_code = models.CharField(max_length=255, null=False)
    cover_url = models.CharField(max_length=255, null=False)
    categories = ArrayField(models.IntegerField(),null=True, blank=True, default=list)

    class Meta:
        db_table = 'games'
        managed = False

    def __str__(self):
        return self.title

class Category(models.Model):
    code = models.IntegerField(null=False)
    name = models.CharField(max_length=255, null=False)
    description = models.CharField(max_length=255, null=False)

    class Meta:
        db_table = 'categories'
        managed = False

class Review(models.Model):
    user = models.CharField(max_length=255, null=False)
    videoGameCode = models.IntegerField(null=False)
    reviewDate = models.DateField(default=timezone.now)
    rating = models.IntegerField(null=False, validators=[MinValueValidator(0), MaxValueValidator(5)])
    comments = models.CharField(max_length=255)

    def __str__(self):
        return self.user + " " + str(self.rating)

    class Meta:
        db_table = 'reviews'
        managed = False

class Ranking(models.Model):
    user = models.CharField(max_length=255, null=False)
    ranking_date = models.DateField(default=timezone.now)
    categoryCode = models.IntegerField(null=False)
    rating = ArrayField(models.IntegerField(),null=True, blank=True, default=list)

    def __str__(self):
        return self.user + " " + str(self.categoryCode)
    class Meta:
        db_table = 'rankings'
        managed = False


