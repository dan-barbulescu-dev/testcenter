#!/bin/bash

# Rename SSL-config file
read -p "SSL config file will be renamed and additional TLS settings will be added. This may overwrite customizations. \
Certificate paths are untouched.
Refer to the Documentation and Changelog if you want to do this change manually.
Continue with this step? [y/N]:" -r -n 1 -e CONTINUE
if [[ $CONTINUE =~ [yY] ]]
  then
    mv config/cert_config.yml config/tls-config.yml 2>/dev/null
    sed -i 's/tls:/tls: \
      options: \
        default: \
          minVersion: VersionTLS12 \
          cipherSuites: \
            - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256 \
            - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384 \
            - TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256 \
            - TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384 \
            - TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256 \
            - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384/' config/tls-config.yml
fi


# include mySQL-config
REPO_URL=iqb-berlin/testcenter
source .env
wget -nv -O config/my.cnf https://raw.githubusercontent.com/${REPO_URL}/${VERSION}/scripts/database/my.cnf

echo "Patch done"
