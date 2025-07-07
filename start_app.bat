@echo off
REM --- Si no existe el entorno, créalo:
if not exist venv (
    python -m venv venv
)
REM --- Activa el entorno
call venv\Scripts\activate
REM --- Instala dependencias (solo la primera vez o si cambian)
pip install -r requirements.txt
REM --- Ejecuta la aplicación
python src\app.py
pause
