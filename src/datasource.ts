import { IntegrationBase } from "@budibase/types"
import fetch from "node-fetch"
import nano from 'nano';

interface Query {
  method: string
  body?: string
  headers?: { [key: string]: string }
}

interface UserDocument {
  _id: string;
  _rev: string;
  roles: {
    [key: string]: string
  };
  firstName: string;
  lastName: string;
}

class CustomIntegration implements IntegrationBase {
  private readonly url: string
  private readonly cookie: string
  private readonly user: string
  private readonly password: string

  constructor(config: { url: string; cookie: string, user:string, password:string }) {
    this.url = config.url
    this.cookie = config.cookie
    this.user = config.user
    this.password = config.password
  }

  async request(url: string, opts: Query) {
    if (this.cookie) {
      const cookie = { Cookie: this.cookie }
      opts.headers = opts.headers ? { ...opts.headers, ...cookie } : cookie
    }
    const response = await fetch(url, opts)
    if (response.status <= 300) {
      try {
        const contentType = response.headers.get("content-type")
        if (contentType?.includes("json")) {
          return await response.json()
        } else {
          return await response.text()
        }
      } catch (err) {
        return await response.text()
      }
    } else {
      const err = await response.text()
      throw new Error(err)
    }
  }

  async read(query: { userId: string }) {
    const opts = {
      method: "GET",
    }
    // return `${this.url}/global-db/${query.userId}`
    const curr_nano = nano({url:this.url,parseUrl: false}); // Replace with your CouchDB URL
    await curr_nano.auth(this.user, this.password)
    let db = curr_nano.db.use('global-db')
    const doc = await db.get(query.userId) as UserDocument
    return doc
  }

  async update(query: { userId: string, rolesJson: string, firstName: string, lastName: string }) {
    const opts = {
      method: "GET",
    }
    const curr_nano = nano({url:this.url,parseUrl: false}); // Replace with your CouchDB URL
    await curr_nano.auth(this.user, this.password)
    let db = curr_nano.db.use('global-db')
    const doc = await db.get(query.userId) as UserDocument
    doc.firstName = query.firstName
    doc.lastName = query.lastName
    doc.roles = {...doc.roles,  ...JSON.parse(query.rolesJson) }
    const response = await db.insert(doc);
    return response
  }

  async delete(query:  { userId: string, rolesJson: string }) {
    const opts = {
      method: "GET",
    }
    const curr_nano = nano({url:this.url,parseUrl: false}); // Replace with your CouchDB URL
    await curr_nano.auth(this.user, this.password)
    let db = curr_nano.db.use('global-db')
    const doc = await db.get(query.userId) as UserDocument
    
    for (const [key, value] of Object.entries(JSON.parse(query.rolesJson))) {
      delete doc.roles[key]
    }
    const response = await db.insert(doc);
    return response
  }
}

export default CustomIntegration
