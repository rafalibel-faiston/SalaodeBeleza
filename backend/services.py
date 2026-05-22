import mercadopago
import os
from uuid import uuid4

# Em produção no Render, você vai configurar essa chave nas variáveis de ambiente
ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "TEST-sua-chave-aqui")

sdk = mercadopago.SDK(ACCESS_TOKEN)

def create_pix_payment(appointment_id: int, description: str, amount: float, client_email: str):
    """
    Gera a cobrança Pix no Mercado Pago e retorna o QR Code e o Copia e Cola.
    """
    
    # O Mercado Pago exige um e-mail. Como nosso fluxo foca no WhatsApp,
    # caso não tenhamos o e-mail, usamos um genérico baseado no ID do cliente.
    email_to_use = client_email if client_email else f"cliente_{appointment_id}@lashsalon.com"
    
    payment_data = {
        "transaction_amount": amount,
        "description": description,
        "payment_method_id": "pix",
        "payer": {
            "email": email_to_use
        },
        # Um UUID único evita que a mesma cobrança seja gerada duas vezes por erro
        "external_reference": str(appointment_id) 
    }

    # Você precisa de uma chave de idempotência exclusiva para cada requisição ao MP
    request_options = mercadopago.config.RequestOptions()
    request_options.custom_headers = {
        'x-idempotency-key': str(uuid4())
    }

    payment_response = sdk.payment().create(payment_data, request_options)
    payment = payment_response["response"]

    # Se der erro de autorização ou saldo, a API do MP retorna um status diferente de 200/201
    if "error" in payment:
        return {"error": payment["message"]}

    # Extraímos os dados que o Front-end precisa para exibir ao cliente
    return {
        "payment_id": payment["id"],
        "qr_code_base64": payment["point_of_interaction"]["transaction_data"]["qr_code_base64"],
        "qr_code": payment["point_of_interaction"]["transaction_data"]["qr_code"], # O 'Copia e Cola'
        "ticket_url": payment["point_of_interaction"]["transaction_data"]["ticket_url"]
    }