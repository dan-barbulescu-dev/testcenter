#!/bin/bash

REPO_URL=iqb-berlin/testcenter

create_backup() {
  mkdir -p backup/$(date +"%m-%d-%Y")
  rsync -a . backup/$(date +"%m-%d-%Y")/ --exclude backup
  echo "Backup created. Files have been moved to: backup/$(date +"%m-%d-%Y")"
}

apply_patches() {
  wget -nv -O patch-list.json "https://scm.cms.hu-berlin.de/api/v4/projects/6099/repository/tree?path=dist-src/patches&ref=upd-test1"
  grep -oP '"name":".+?"' patch-list.json | cut -d':' -f 2 | tr -d '"' > patch-list.txt
  while read p; do
    echo "$p"
    if dpkg --compare-versions $p gt $VERSION; then
      wget -nv -O $p "https://scm.cms.hu-berlin.de/api/v4/projects/6099/repository/files/dist-src%2Fpatches%2F${p}/raw?ref=upd-test1"
      bash ${p}
      rm ${p}
    fi
  done < patch-list.txt
  rm patch-list.json
  rm patch-list.txt
}

create_backup

source .env
printf "Installed version: $VERSION\n"

latest_version_tag=$(curl -s https://api.github.com/repos/$REPO_URL/releases/latest | grep tag_name | cut -d : -f 2,3 | tr -d \" | tr -d , | tr -d " " )
printf "Latest available version: $latest_version_tag\n"

if [ $VERSION = $latest_version_tag ]; then
  echo "Latest version is already installed."
  exit 0
fi

sed -i "s#VERSION=.*#VERSION=$latest_version_tag#" .env

apply_patches

echo "Update applied"
