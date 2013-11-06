/**
 * Tenant management module
 */

var database = require('./database'),
    logger = require('./logger'),
    configuration = require('./configuration');

exports = module.exports = {
  /**
   * creates a tenant
   *
   * @param {object} tenant - a fully defined tenant object
   * @param {function} callback - function of the form function (error, tenant)
   */

  createTenant: function (tenant, callback) {
    var db = database.getDatabase();

    // name is our primary unique identifier
    if (!tenant.name || 'string' !== typeof tenant.name) {
      callback(new Error('Tenant email is required!'));
      return;
    }

    // create db details if not supplied
    if (!tenant.database) {
      tenant.database = {
        dbName: configuration.getConfig('tenantPrefix') + tenant.name,
        dbHost: configuration.getConfig('dbHost'),
        dbUser: configuration.getConfig('dbUser'),
        dbPass: configuration.getConfig('dbPass'),
        dbPort: configuration.getConfig('dbPort')
      };
    }

    // verify the tenant name
    db.retrieve('Tenant', { name: tenant.name }, function (error, results) {
      if (error) {
        callback(error);
      } else if (results && results.length) {
        // tenant exists
        callback(new Error('Tenant already exists'));
      } else {
        db.create('Tenant', tenant, function (error, result) {
          // wrap the callback since we might want to alter the result
          if (error) {
            logger.log('error', 'Failed to create tenant: ', tenant);
            callback(error);
          } else {
            callback(null, result);
          }
        });
      }
    });
  },

  /**
   * retrieves tenants matching the search
   *
   * @param {object} search - fields of tenant that should be matched
   * @param {function} callback - function of the form function (error, tenants)
   */

  retrieveTenants: function (search, callback) {
    var db = database.getDatabase();

    // delegate to db retrieve method
    db.retrieve('Tenant', search, callback);
  },

  /**
   * retrieves a single tenant
   *
   * @param {object} search - fields to match: should use 'name' or '_id' which are unique
   * @param {function} callback - function of the form function (error, tenant)
   */

  retrieveTenant: function (search, callback) {
    var db = database.getDatabase();

    db.retrieve('Tenant', search, function (error, results) {
      if (error) {
        callback(error);
      } else if (results && results.length > 0) {
        if (results.length === 1) {
          // we only want to retrieve a single tenant, so we send an error if we get multiples
          callback(null, results[0]);
        } else {
          callback(new Error('Tenant search expected a single result but returned ' + results.length + ' results'));
        }
      } else {
        callback(null, false);
      }
    });
  },

  /**
   * updates a single tenant
   *
   * @param {object} search - fields to match: should use 'name' or '_id' which are unique
   * @param {object} update - fields to change and their values
   * @param {function} callback - function of the form function (error, tenant)
   */

  updateTenant: function (search, update, callback) {
    var db = database.getDatabase();

    // only execute if we have a single matching record
    this.retrieveTenant(search, function (error, result) {
      if (error) {
        callback(error);
      } else if (result) {
        db.update('Tenant', search, update, callback);
      } else {
        callback(new Error('No matching tenant record found'));
      }
    });
  },

  /**
   * sets the 'active' state of a single tenant. We don't hard delete tenants.
   *
   * @param {object} tenant - must match the tenant in db
   * @param {boolean} active - the active state, true or false
   * @param {function} callback - function of the form function (error)
   */

  setTenantActive: function (tenant, active, callback) {
    var db = database.getDatabase();

    // confirm the tenant exists and is there is only one of them
    this.retrieveTenant(tenant, function (error, result) {
      if (error) {
        callback(error);
      } else if (result) {
        this.updateTenant({ '_id': result._id }, { 'active': active }, callback);
      } else {
        callback(new Error('No matching tenant record found'));
      }
    });
  },

  /**
   * deletes a single tenant - usually we don't want to delete a tenant, only
   * set it to inactive
   *
   * @param {object} tenant - must match the tenant in db
   * @param {function} callback - function of the form function (error)
   */

  deleteTenant: function (tenant, callback) {
    var db = database.getDatabase();

    // confirm the tenant exists and is there is only one of them
    this.retrieveTenant(tenant, function (error, result) {
      if (error) {
        callback(error);
      } else if (result) {
        db.destroy('Tenant', tenant, callback);
      } else {
        callback(new Error('No matching tenant record found'));
      }
    });
  }
};

