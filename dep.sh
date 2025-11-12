#!/bin/sh

echo "building webforms"
grunt develop

cp ~/git/webform/build/js/enketo-bundle.js WebContent/build/js/webform-bundle.js

if [ "$1" != develop ]
then
	rm WebContent/build/js/webform-bundle.min.js

        # uglify
        pushd ~/git/webform
        grunt minify
        popd

	cp ~/git/webform/build/js/bundle.min.js WebContent/build/js/webform-bundle.min.js

else
        # Rename the non minified version so that it can be used
	cp ~/git/webform/build/js/enketo-bundle.js WebContent/build/js/webform-bundle.min.js
fi

./enk_up.sh
