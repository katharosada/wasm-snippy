#!/bin/bash

set -e

OUTPUT_FILE="database_cert.pem"
KEY_FILE="key.pem"
CERT_FILE="cert.pem"

# Generate a private key without a password
openssl genpkey -algorithm RSA -out "$KEY_FILE" -pkeyopt rsa_keygen_bits:2048

# Create a self-signed certificate using the private key, valid for 365 days
openssl req -new -x509 -key "$KEY_FILE" -out "$CERT_FILE" -days 365 \
    -subj "/C=US/ST=State/L=City/O=Company/OU=Department/CN=example.com"

# Combine the certificate and key into a single PEM file
cat "$CERT_FILE" "$KEY_FILE" > "$OUTPUT_FILE"

# Clean up the temporary files
rm -f "$KEY_FILE" "$CERT_FILE"

echo "Certificate and key have been successfully combined into '$OUTPUT_FILE'."
