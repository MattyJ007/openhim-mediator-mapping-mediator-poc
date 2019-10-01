'use strict'

import express from 'express'
import fs from 'fs'
import objectMapper from 'object-mapper'
import { toJson, toXml } from 'xml2json'

import {
  registerMediator,
  activateHeartbeat,
  fetchConfig
} from 'openhim-mediator-utils'

import mediatorConfig, { urn } from './mediatorConfig.json'

const inputValidationFile = fs.readFileSync('./customMappings/patient/input.json')
const inputJson = JSON.parse(inputValidationFile)

const constantsFile = fs.readFileSync('./customMappings/patient/constants.json')
const constantsJson = JSON.parse(constantsFile)

const metaDataFile = fs.readFileSync('./customMappings/patient/meta.json')
const metaJson = JSON.parse(metaDataFile)

const mappingFile = fs.readFileSync('./customMappings/patient/mapping.json')
const mappingJson = JSON.parse(mappingFile)

const openhimConfig = {
  username: 'root@openhim.org',
  password: 'password',
  apiURL: 'https://localhost:8080',
  trustSelfSigned: true,
  urn
}

const app = express()

app.use(express.json())

app.post(metaJson.endpoint.pattern, (req, res) => {
  validate(req.body)

  const outputMessage = transform(req.body, mappingJson)

  res.send(JSON.stringify(outputMessage))
})

export const validate = (data) => {
  for (const [key, value] of Object.entries(inputJson)) {
    validateField(key, value, data[key])
  }
}

const validateField = (key, value, dataValue) => {
  if (!value.validation) {
    throw new Error(`Validation rule missing for field: ${key}`)
  }
  if (dataValue) {
    if (typeof(dataValue) === value.validation.type) {
      console.debug(`Successfully Validated value: ${dataValue} - type: ${value.validation.type}`)
      return
    } else {
      throw new Error(`Input value is not the correct type: ${typeof(dataValue)} - required ${value.validation.type}`)
    }
  } else if (!value.validation.optional) {
    throw new Error(`Required field missing: ${key}`)
  }
}

export const transform = (data, schema) => {
  const output = {}

  Object.assign(output, objectMapper(data, schema.input))
  Object.assign(output, objectMapper(constantsJson, schema.constant))

  console.log('Output: ', output)
  return output
}

app.listen(3000, () => {
  console.log('Server listening on port 3000...')

  mediatorSetup()
})

const mediatorSetup = () => {
  registerMediator(openhimConfig, mediatorConfig, err => {
    if (err) {
      console.error('Failed to register mediator. Check your Config: ', err)
      process.exit(1)
    }

    console.log('Successfully registered mediator!')

    fetchConfig(openhimConfig, (err, initialConfig) => {
      if (err) {
        console.error('Failed to fetch initial config: ', err)
        process.exit(1)
      }

      const emitter = activateHeartbeat(openhimConfig)

      emitter.on('error', err => {
        console.error('Heartbeat failed: ', err)
      })
    })
  })
}
