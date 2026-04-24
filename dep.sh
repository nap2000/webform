#!/bin/sh

# Builds webform and copies bundle and assets to smapServer

echo "building webforms"
smapServer=$HOME/git/prop-smapserver/smapServer
target=$smapServer/WebContent/build/js/webform-bundle.min.js

npm run compile

if [ "$1" != develop ]
then
    npm run minify
    cp build/js/bundle.min.js $target
else
    cp build/js/enketo-bundle.js $target
fi

cp build/css/* $smapServer/WebContent/build/css
cp build/fonts/* $smapServer/WebContent/build/fonts

rm -rf $smapServer/WebContent/build/locales/*
for d in locales/* ; do
    if [ -d "$d" ]; then
        n=$(basename "$d")
        echo "Getting translation file for " $n
        mkdir $smapServer/WebContent/build/locales/$n
        cp $d/translation.json $smapServer/WebContent/build/locales/$n/translation.json
    fi
done
