import tkinter as tk
from tkinter import filedialog, messagebox
import csv
import os

class CsvUnificadorApp:
    def __init__(self, root):
        """Inicializa la aplicación y configura la interfaz de usuario."""
        self.root = root
        self.root.title("Unificador de Fichas de Detenidos")
        self.root.geometry("800x600")

        self.data = {
            "reincidencia": {},
            "companeros": {},
            "denuncias": {},
            "viajes": {}
        }
        self.file_paths = {
            "reincidencia": "",
            "companeros": "",
            "denuncias": "",
            "viajes": ""
        }

        self.setup_ui()

    def setup_ui(self):
        """Configura todos los widgets de la interfaz gráfica."""
        # Frame principal para los controles de carga de archivos
        file_frame = tk.LabelFrame(self.root, text="1. Cargar Archivos CSV", padx=10, pady=10)
        file_frame.pack(padx=10, pady=10, fill="x")

        # Botones y etiquetas para cada archivo
        self.create_file_selector(file_frame, "reincidencia", "A.- FORMULA_REINCIDENCIA_DETENIDOS.xlsx - Sheet1.csv")
        self.create_file_selector(file_frame, "companeros", "B.- FORMULA_COMPAÑEROS_DELITOS.xlsx - Datos Formateados.csv")
        self.create_file_selector(file_frame, "denuncias", "C.- FORMULA_DENUNCIAS_DETENIDOS.xlsx - Sheet1.csv")
        self.create_file_selector(file_frame, "viajes", "D.- FORMULA_SALIDAS_Y_ENTRADAS_AL _PAIS.xlsx - Viajes.csv")

        # Frame para la entrada del RUN y los botones de acción
        action_frame = tk.LabelFrame(self.root, text="2. Generar Ficha", padx=10, pady=10)
        action_frame.pack(padx=10, pady=10, fill="x")

        tk.Label(action_frame, text="Ingrese el RUN del detenido:").pack(side="left", padx=(0, 5))
        self.run_entry = tk.Entry(action_frame, width=30)
        self.run_entry.pack(side="left", padx=(0, 10))

        tk.Button(action_frame, text="Generar Formato Word", command=self.generate_word_format).pack(side="left", padx=(0, 10))
        tk.Button(action_frame, text="Limpiar", command=self.clear_fields).pack(side="left")

        # Área de texto para el resultado final
        result_frame = tk.LabelFrame(self.root, text="3. Formato para Word", padx=10, pady=10)
        result_frame.pack(padx=10, pady=10, fill="both", expand=True)

        self.output_text = tk.Text(result_frame, wrap="word", height=20)
        self.output_text.pack(fill="both", expand=True)

        tk.Button(result_frame, text="Copiar al Portapapeles", command=self.copy_to_clipboard).pack(pady=5)

    def create_file_selector(self, parent_frame, key, default_filename):
        """Crea los widgets para seleccionar un archivo."""
        frame = tk.Frame(parent_frame)
        frame.pack(anchor="w", pady=2)
        
        tk.Label(frame, text=f"Archivo '{default_filename}':").pack(side="left")
        
        label_text = tk.StringVar()
        label_text.set("No cargado")
        label = tk.Label(frame, textvariable=label_text)
        label.pack(side="left", padx=5)

        def open_file():
            filepath = filedialog.askopenfilename(
                title=f"Seleccionar '{default_filename}'",
                filetypes=[("CSV files", "*.csv")]
            )
            if filepath:
                self.file_paths[key] = filepath
                label_text.set(os.path.basename(filepath))
                self.load_data_from_csv(key, filepath)
                messagebox.showinfo("Éxito", f"Archivo '{os.path.basename(filepath)}' cargado correctamente.")

        tk.Button(frame, text="Cargar archivo", command=open_file).pack(side="left")

    def load_data_from_csv(self, key, filepath):
        """Carga los datos desde un archivo CSV y los almacena en el diccionario."""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f, delimiter=',')
                temp_data = {}
                for row in reader:
                    # Usamos la columna 'Run' como clave para identificar a la persona
                    # Asumiendo que esta columna existe en todos los archivos
                    run = row.get('Run', '').strip()
                    if run:
                        # Para algunos archivos puede haber varios registros por 'Run', los guardamos como una lista
                        if run not in temp_data:
                            temp_data[run] = []
                        temp_data[run].append(row)
                self.data[key] = temp_data
        except Exception as e:
            messagebox.showerror("Error de Carga", f"No se pudo cargar el archivo {os.path.basename(filepath)}: {e}")

    def generate_word_format(self):
        """Genera el texto formateado para Word a partir de los datos cargados."""
        run_to_search = self.run_entry.get().strip().upper()
        if not run_to_search:
            messagebox.showwarning("Entrada Vacía", "Por favor, ingrese un RUN.")
            return

        self.output_text.delete("1.0", tk.END)
        output_lines = []

        # Título del informe
        output_lines.append(f"INFORME DEL DETENIDO CON RUN: {run_to_search}\n")
        output_lines.append("-" * 50)
        
        # Procesar datos de reincidencia
        output_lines.append("\n--- Ficha de Reincidencia ---\n")
        reincidencia_records = self.data["reincidencia"].get(run_to_search, [])
        if reincidencia_records:
            for record in reincidencia_records:
                output_lines.append(f"RUN: {record.get('Run', 'N/A')}")
                output_lines.append(f"Nombre Completo: {record.get('Nombre', 'N/A')} {record.get('Segundo Nombre', '')} {record.get('Paterno', 'N/A')} {record.get('Materno', 'N/A')}")
                output_lines.append(f"Delito: {record.get('Delito', 'N/A')}")
                output_lines.append(f"Fecha: {record.get('Fecha', 'N/A')}")
                output_lines.append(f"Resumen: {record.get('Resumen', 'N/A')}\n")
        else:
            output_lines.append("No se encontraron registros de reincidencia para este RUN.\n")

        # Procesar datos de compañeros de delitos
        output_lines.append("\n--- Compañeros de Delitos ---\n")
        companeros_records = self.data["companeros"].get(run_to_search, [])
        if companeros_records:
            for record in companeros_records:
                output_lines.append(f"Nombre: {record.get('Nombre', 'N/A')} {record.get('Paterno', 'N/A')}")
                output_lines.append(f"RUN: {record.get('Run', 'N/A')}")
                output_lines.append(f"Delito: {record.get('Delito', 'N/A')}")
                output_lines.append(f"Parte Nro: {record.get('Parte', 'N/A')}\n")
        else:
            output_lines.append("No se encontraron registros de compañeros para este RUN.\n")

        # Procesar datos de denuncias
        output_lines.append("\n--- Denuncias ---\n")
        denuncias_records = self.data["denuncias"].get(run_to_search, [])
        if denuncias_records:
            for record in denuncias_records:
                output_lines.append(f"Tipo: {record.get('Clase', 'N/A')}")
                output_lines.append(f"Delito: {record.get('Delito', 'N/A')}")
                output_lines.append(f"Fecha: {record.get('Fecha', 'N/A')}")
                output_lines.append(f"Unidad: {record.get('Unidad', 'N/A')}\n")
        else:
            output_lines.append("No se encontraron registros de denuncias para este RUN.\n")

        # Procesar datos de viajes
        output_lines.append("\n--- Viajes (Entradas y Salidas del País) ---\n")
        viajes_records = self.data["viajes"].get(run_to_search, [])
        if viajes_records:
            # Los viajes no tienen el RUN en las filas de datos, solo en el encabezado.
            # Los datos que proporcionaste no tienen la columna 'Run' en este archivo.
            # Para fines de este ejemplo, asumiremos que el archivo está relacionado con el RUN del detenido principal.
            # Para que esto funcione en la realidad, el archivo de viajes debe tener una columna 'Run'.
            # A falta de esa columna, y basándonos en los datos de muestra, este apartado no mostrará resultados.
            output_lines.append("ATENCIÓN: La columna 'Run' no existe en los datos de viajes proporcionados.\n")
            output_lines.append("Para que esta sección funcione, el archivo 'Viajes.csv' debe incluir una columna 'Run' para el detenido.\n")
        else:
            output_lines.append("No se encontraron registros de viajes para este RUN o el archivo no es compatible.\n")

        self.output_text.insert(tk.END, "".join(output_lines))

    def clear_fields(self):
        """Limpia todos los campos de la interfaz."""
        self.run_entry.delete(0, tk.END)
        self.output_text.delete("1.0", tk.END)

    def copy_to_clipboard(self):
        """Copia el contenido del área de texto al portapapeles."""
        self.root.clipboard_clear()
        self.root.clipboard_append(self.output_text.get("1.0", tk.END))
        messagebox.showinfo("Copiado", "El texto ha sido copiado al portapapeles.")

if __name__ == "__main__":
    root = tk.Tk()
    app = CsvUnificadorApp(root)
    root.mainloop()

