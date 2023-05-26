const nodeHelper = require("node_helper")
const bodyParser = require("body-parser")


module.exports = nodeHelper.create({
  start: function () {
    this.expressApp.use(bodyParser.urlencoded({ extended: true }))
    this.expressApp.post('/logext', bodyParser.json(), bodyParser.text(), (req, res, next) => {
      // if req.body is string (from fetch), parse it to JSON, otherwise it's already JSON (from sendBeacon)
      try {
        let {method, context} = (typeof req.body === 'string') ? JSON.parse(req.body) : req.body
        context = Array.isArray(context) ? context : [context]
        console[method](...context)
        res.status(200).send('OK')
      } catch (error) {
        console.error(error)
        res.status(500).send('ERROR')
      }
    })
  },

  receivedSocketNotification: function (notification, payload) {
    if (notification === 'CONFIG') this.config = {...this.config, ...payload}
  }
})