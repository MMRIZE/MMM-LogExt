"use strict"

Module.register("MMM-LogExt", {
  defaults: {
    echo: true,
    notificationMonitor: (notification, payload, senderName) => {
      return ''
    },
    beforeContext: ({method, location}) => {
      switch (method) {
        case 'error': return `\x1b[1;31m[${location}]\x1b[0m`
        default: return `\x1b[1m[${location}]\x1b[0m`
      }
    },
    afterContext: () => {
      return ''
    },
    replaceJSON: (key, value) => {
      return value
    }
  },

  fallbacks: {
    notificationMonitor: () => {
      return ''
    },
    beforeContext: () => {
      return ''
    },
    afterContext: () => {
      return ''
    },
    replaceJSON: (key, value) => {
      return value
    }
  },

  notificationReceived: function (noti, pl, sender) {
    const msg = ((typeof this.config.notificationMonitor === 'function') ? this.config.notificationMonitor : this.fallbacks.notificationMonitor)(noti, pl, (sender?.name ?? ''))

    if (msg) {
      let context = ['[NOTIFICATION]', msg]
      this.send({method: 'log', context})
      if (this.config.echo) console.log(...context)
    }
  },

  start: function() {
    if (!navigator.sendBeacon) {
      Log.warn("MMM-LogExt: navigator.sendBeacon is not supported in this browser.")
      // return
    }

    /* reserved for later use : Multi-screen/device support.
    const hashCode = (s) => {
      return [...s].reduce(
        (hash, c) => (Math.imul(31, hash) + c.charCodeAt(0)) | 0,
        0
      )
    }
    */
    
    const beforeContext = (typeof this.config.beforeContext === 'function') ? this.config.beforeContext : this.fallbacks.beforeContext
    const afterContext = (typeof this.config.afterContext === 'function') ? this.config.afterContext : this.fallbacks.afterContext
    const filtered = (value) => {
      return (value) ? [value] : []
    }

    window.onerror = (msg, url, lineNo, columnNo, error) => {
      const location = `${url.split('/').at(-1)}:${lineNo}:${columnNo}`
      const context = [
        '[ERROR]',
       ...filtered(beforeContext({method: 'error', location, stack: error.stack, context:msg})),
        msg,
        ...filtered(afterContext({method: 'error', location, stack: error.stack, context:msg}))
      ]
      this.send({method: 'error', context})
      if (this.config.echo) console.error(error.stack)
      return false
    }

    window.onunhandledrejection = (event) => {
      const stack = event.reason.stack.split('\n')
      const msg = stack[0]
      const location = `${stack[1].split('/').at(-1)}`.replaceAll(')', '')
      const context = [
        '[UNHANDLED REJECTION]', 
        ...filtered(beforeContext({method: 'error', location, stack, context:msg})), 
        msg, 
        ...filtered(afterContext({method: 'error', location, stack, context:msg}))
      ]
      this.send({method: 'error', context})
      if (this.config.echo) console.error(event.reason.stack)
      return false
    }
    
    const logLevel = config.logLevel
    for (let method of Object.keys(Log)) {
      if (!logLevel.includes(method.toLocaleUpperCase())) continue

      Log[method] = Function.prototype.bind.call((...args) => {
        let stack = new Error().stack
        stack = stack.split('\n').slice(2)
        let location = stack[0].trim().split('/').at(-1).replaceAll(')', '')
        
        let context = [
          ...filtered(beforeContext({method, location, stack, context:args})), 
          ...args,
          ...filtered(afterContext({method, location, stack, context:args}))
        ]
        this.send({method, context})
        if (this.config.echo) console[method](...context)
      }, console)
    }
    Log.log("MMM-LogExt hooks original Log from now on.")

    //let userAgent = navigator.userAgent
    //Log.info(`Broswer ID : ${hashCode(userAgent)} for ${userAgent}`) // Reserved for later use : Multi-screen/device support.
  },

  send: function (dataObj) {
    // use navigator.sendBeacon if available, fallback is fetch with keepalive option
    const replaceJSON = (typeof this.config.replaceJSON === 'function') ? this.config.replaceJSON : this.fallbacks.replaceJSON
    const url = '/logext'
    const payload = JSON.stringify(dataObj, replaceJSON)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, payload)
    }
    else {
      fetch(url, {
        method: 'POST',
        body: payload,
        keepalive: true
      })
    }
  }
})