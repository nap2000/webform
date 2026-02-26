#!/bin/sh

# This script builds a bundled javascript file and then copies it and other webform files to smapServer

echo "deploying webforms"
smapServer=$HOME/git/prop-smapserver/smapServer
target=$smapServer/WebContent/build/js/webform-bundle.min.js

if [ "$1" != develop ]
then

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

