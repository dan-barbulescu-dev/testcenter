#!/bin/bash

REPO_URL=iqb-berlin/testcenter

create_backup() {
  mkdir -p backup/$(date +"%m-%d-%Y")
  mv !(backup/$(date +"%m-%d-%Y") backup/$(date +"%m-%d-%Y")
  cp .env backup/$(date +"%m-%d-%Y")
  echo "Backup created. Files have been moved to: backup/$(date +"%m-%d-%Y")"
}

apply_patches() {
#  wget -nv -O patch-list.txt https://api.github.com/repos/${REPO_URL}/contents/dist-src/patches/patch-list.txt?ref=$latest_version_tag
  wget -nv -O patch-list.json https://scm.cms.hu-berlin.de/api/v4/projects/6099/repository/tree?path=dist-src/patches
  grep -oP '"name":".+?"' patch-list.json | cut -d':' -f 2 | tr -d '"' > patch-list.txt
  while read p; do
    echo "$p"
    if dpkg --compare-versions $p gt $VERSION; then
      wget -nv https://scm.cms.hu-berlin.de/api/v4/projects/6099/repository/files/dist-src%2Fpatches%2F${p}/raw?ref=$latest_version_tag
#      wget -nv https://api.github.com/repos/${REPO_URL}/contents/dist-src/patches/${p}?ref=$latest_version_tag
      bash ${p}
      rm ${p}
    fi
  done < patch-list.txt
  rm patch-list.txt
}

source .env
printf "\nInstalled version: $VERSION\n\n"

latest_version_tag=$(curl -s https://api.github.com/repos/$REPO_URL/releases/latest | grep tag_name | cut -d : -f 2,3 | tr -d \" | tr -d , | tr -d " " )
printf "Latest available version: $latest_version_tag\n"

if [ $VERSION = $latest_version_tag ]; then
  echo "Latest version is already installed."
  exit 0
fi

create_backup
apply_patches

echo "Update applied"
