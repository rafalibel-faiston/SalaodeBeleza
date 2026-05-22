import requests

# URL da sua API (mude para o localhost se for rodar no seu computador)
BASE_URL = "https://sistema-salao-cilios.onrender.com/services/"
# Se estiver testando local, use: BASE_URL = "http://localhost:8000/services/"

catalog = [
    # --- EXTENSÕES TRADICIONAIS ---
    {"name": "Volume Brasileiro (Fio Y) - Aplicação", "category": "cilios", "base_price": 115.00, "deposit_amount": 30.00, "estimated_minutes": 150},
    {"name": "Volume Brasileiro (Fio Y) - Manutenção (15 a 20 dias)", "category": "cilios", "base_price": 75.00, "deposit_amount": 30.00, "estimated_minutes": 120},
    {"name": "Volume Brasileiro (Fio Y) - Manutenção (Até 25 dias)", "category": "cilios", "base_price": 80.00, "deposit_amount": 30.00, "estimated_minutes": 120},

    {"name": "Volume Egípcio (Fio 4D) - Aplicação", "category": "cilios", "base_price": 120.00, "deposit_amount": 30.00, "estimated_minutes": 150},
    {"name": "Volume Egípcio (Fio 4D) - Manutenção (15 a 20 dias)", "category": "cilios", "base_price": 80.00, "deposit_amount": 30.00, "estimated_minutes": 120},
    {"name": "Volume Egípcio (Fio 4D) - Manutenção (Até 25 dias)", "category": "cilios", "base_price": 85.00, "deposit_amount": 30.00, "estimated_minutes": 120},

    {"name": "Volume Luxxo (Fio 5D) - Aplicação", "category": "cilios", "base_price": 125.00, "deposit_amount": 30.00, "estimated_minutes": 150},
    {"name": "Volume Luxxo (Fio 5D) - Manutenção (15 a 20 dias)", "category": "cilios", "base_price": 85.00, "deposit_amount": 30.00, "estimated_minutes": 120},
    {"name": "Volume Luxxo (Fio 5D) - Manutenção (Até 25 dias)", "category": "cilios", "base_price": 90.00, "deposit_amount": 30.00, "estimated_minutes": 120},

    {"name": "Volume Glamour (Fio 6D) - Aplicação", "category": "cilios", "base_price": 130.00, "deposit_amount": 30.00, "estimated_minutes": 150},
    {"name": "Volume Glamour (Fio 6D) - Manutenção (15 a 20 dias)", "category": "cilios", "base_price": 90.00, "deposit_amount": 30.00, "estimated_minutes": 120},
    {"name": "Volume Glamour (Fio 6D) - Manutenção (Até 25 dias)", "category": "cilios", "base_price": 95.00, "deposit_amount": 30.00, "estimated_minutes": 120},

    {"name": "Volume Foxy Eyes (Fio 5D Curvature M) - Aplicação", "category": "cilios", "base_price": 130.00, "deposit_amount": 30.00, "estimated_minutes": 150},
    {"name": "Volume Foxy Eyes (Fio 5D Curvature M) - Manutenção (15 a 20 dias)", "category": "cilios", "base_price": 90.00, "deposit_amount": 30.00, "estimated_minutes": 120},

    # --- TÉCNICA CAPPING (SEM MANUTENÇÃO) ---
    {"name": "Volume Mega Brasileiro (Fio Y CAPPING)", "category": "cilios", "base_price": 135.00, "deposit_amount": 30.00, "estimated_minutes": 180},
    {"name": "Volume Mega Egípcio (Fio 4D CAPPING)", "category": "cilios", "base_price": 140.00, "deposit_amount": 30.00, "estimated_minutes": 180},
    {"name": "Volume Mega Luxxo (Fio 5D CAPPING)", "category": "cilios", "base_price": 145.00, "deposit_amount": 30.00, "estimated_minutes": 180},

    # --- SOBRANCELHAS & COMPLEMENTOS ---
    {"name": "Brow Lamination Simples", "category": "sobrancelha", "base_price": 85.00, "deposit_amount": 15.00, "estimated_minutes": 60},
    {"name": "Brow Lamination com Tintura", "category": "sobrancelha", "base_price": 95.00, "deposit_amount": 15.00, "estimated_minutes": 80},
    {"name": "Design Personalizado de Sobrancelhas", "category": "sobrancelha", "base_price": 30.00, "deposit_amount": 15.00, "estimated_minutes": 45},
    {"name": "Design Personalizado com Henna", "category": "sobrancelha", "base_price": 40.00, "deposit_amount": 15.00, "estimated_minutes": 60},
    {"name": "Depilação de Buço", "category": "sobrancelha", "base_price": 10.00, "deposit_amount": 0.00, "estimated_minutes": 20},

    # --- REMOÇÕES ---
    {"name": "Remoção Química (Cílios feitos por mim + Nova Aplicação)", "category": "remocao", "base_price": 20.00, "deposit_amount": 0.00, "estimated_minutes": 40},
    {"name": "Remoção Química (Após 3 manutenções com aviso prévio)", "category": "remocao", "base_price": 10.00, "deposit_amount": 0.00, "estimated_minutes": 40},
    {"name": "Remoção de Extensão de Outras Profissionais", "category": "remocao", "base_price": 25.00, "deposit_amount": 0.00, "estimated_minutes": 50},
    {"name": "Remoção de Tufos", "category": "remocao", "base_price": 30.00, "deposit_amount": 0.00, "estimated_minutes": 50}
]

def seed_services():
    print("Iniciando a carga do catálogo no banco de dados...")
    for service in catalog:
        response = requests.post(BASE_URL, json=service)
        if response.status_code == 200:
            print(f"Sucesso: {service['name']} adicionado!")
        else:
            print(f"Falha ao adicionar {service['name']}: {response.text}")

if __name__ == "__main__":
    seed_services()