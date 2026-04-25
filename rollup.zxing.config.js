import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'src/js/zxing-entry.js',
    output: {
        file: 'build/js/zxing-bundle.js',
        format: 'iife',
        name: 'ZXing'
    },
    plugins: [
        resolve( {
            mainFields: [ 'browser', 'module', 'main' ],
            browser: true,
        } ),
        commonjs( { sourceMap: false } )
    ]
};
