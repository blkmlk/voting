module.exports = {
    "transpileDependencies": [
        "vuetify"
    ],
    publicPath: '/',
    devServer: {
        proxy: {
            '^/ws': {
                target: 'http://localhost:8090/ws',
                ws: true,
                changeOrigin: true
            }
        }
    }
}