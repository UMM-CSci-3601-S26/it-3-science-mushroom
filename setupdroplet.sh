#!/usr/bin/env bash
# generateSecret simply generates a secure random hex string of numbers and letters that is used for the JWT_SECRET
# "Command -v openssl" checks if openssl exists on the machine
# "openssl rand -hex 64" generates a random code of 128 characters (64 bytes encoded into hexadecimal)
# the output is stored in secret
# There are multiple fallback options that account for most if not all tools
# The fallback options support common systems where OpenSSL, Python, Node, or PowerShell may be available.
generateSecret() {
  local secret

  if command -v openssl >/dev/null 2>&1; then
    secret="$(openssl rand -hex 64 2>/dev/null)"
    if [[ -n "$secret" ]]; then
      echo "$secret"
      return
    fi
  fi

  if command -v python3 >/dev/null 2>&1; then
    secret="$(python3 -c 'import secrets; print(secrets.token_hex(64))' 2>/dev/null)"
    if [[ -n "$secret" ]]; then
      echo "$secret"
      return
    fi
  fi

  if command -v python >/dev/null 2>&1; then
    secret="$(python -c 'import secrets; print(secrets.token_hex(64))' 2>/dev/null)"
    if [[ -n "$secret" ]]; then
      echo "$secret"
      return
    fi
  fi

  if command -v node >/dev/null 2>&1; then
    secret="$(node -e 'console.log(require("crypto").randomBytes(64).toString("hex"))' 2>/dev/null)"
    if [[ -n "$secret" ]]; then
      echo "$secret"
      return
    fi
  fi

  if command -v pwsh >/dev/null 2>&1; then
    secret="$(pwsh -NoProfile -Command '$bytes = New-Object byte[] 64; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); ([BitConverter]::ToString($bytes) -replace "-", "").ToLower()' 2>/dev/null)"
    if [[ -n "$secret" ]]; then
      echo "$secret"
      return
    fi
  fi

  if command -v powershell.exe >/dev/null 2>&1; then
    secret="$(powershell.exe -NoProfile -Command '$bytes = New-Object byte[] 64; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); ([BitConverter]::ToString($bytes) -replace "-", "").ToLower()' 2>/dev/null)"
    if [[ -n "$secret" ]]; then
      echo "$secret"
      return
    fi
  fi

  echo "Could not generate JWT_SECRET. Install OpenSSL, Python, Node.js, or PowerShell and rerun this script." >&2
  exit 1
}

if [[ ! -e /swapfile ]]; then
  echo "/swapfile does not exist, setting up swap"
  # Set up swap space
  fallocate -l 3G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
else
  echo "/swapfile already exists, skipping swap setup"
fi

ip="$(curl -s http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address)"
domain="${ip}.nip.io"

echo
echo "Setting APP_HOST to ${domain}"
echo "APP_HOST=${domain}" > .env
jwt_secret="$(generateSecret)"
if [[ -z "$jwt_secret" ]]; then
  echo "JWT_SECRET was not generated; stopping setup." >&2
  exit 1
fi
echo "JWT_SECRET=${jwt_secret}" >> .env
chmod 600 .env
echo "Generated JWT_SECRET and saved it to .env"
echo
echo "Your site will be served over HTTPS automatically using Let's Encrypt or ZeroSSL."
echo "By continuing, you agree to the Let's Encrypt Subscriber Agreement at:"
echo "https://letsencrypt.org/documents/2017.11.15-LE-SA-v1.2.pdf"
echo "as well as the ZeroSSL Terms of Service at:"
echo "https://zerossl.com/terms/"
echo
echo "Please enter your email address to signify agreement and to be notified"
echo "in case of issues."
read -p "Email address: " email
echo
if [ -z "$email" ]; then
  echo "No email entered; not setting APP_CADDY_GLOBAL_OPTIONS"
else
  echo "Setting APP_CADDY_GLOBAL_OPTIONS to \"email ${email}\""
  echo "APP_CADDY_GLOBAL_OPTIONS=\"email ${email}\"" >> .env
fi
echo
echo "Your server is set up."
echo "Once you start it with 'docker-compose up -d' it will be available at:"
echo "https://${domain}"
echo "You should copy this down somewhere."
