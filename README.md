# ember-data-tastypie-adapter [![Build Status](https://secure.travis-ci.org/escalant3/ember-data-tastypie-adapter.png?branch=master)](https://travis-ci.org/escalant3/ember-data-tastypie-adapter)


## Motivation
- django-tastypie is one of the most widely used libraries to provide a REST interface from a django App.
- The ember-data default RESTAdapter does not follow the conventions used in django-tastypie.
- Instead of forcing the django developer to adapt tastypie to ember-data conventions, this adapter does the dirty work.


## Usage

#### *Javascript side*

##### Using The Adapter With Traditional Script Tages:

1. Copy the javascript files from **dist/global/ember-data-tastypie-adapter.js** and place them on your webserver.
2. Insert the script tags into your document that link to the javascript files you copied to your webserver after your ember-data script tag.  
```javascript
<script type="javascript" src="path/to/your/files/ember-data-tastypie-adapter.js"
```
3. Setup the tastypie adapter and serializer for usage in ember:  
```javascript
App.ApplicationAdapter = DS.DjangoTastypieAdapter.extend({});
App.ApplicationSerializer = DS.DjangoTastypieSerializer.extend({});
```

**Note:** You can also add any paramaters available in the default RESTAdapter and RESTSerializer in ember. See http://emberjs.com/api/data/classes/DS.RESTAdapter.html and http://emberjs.com/api/data/classes/DS.RESTSerializer.html fur full configuration details. An example is shown below.
```javascript
App.ApplicationAdapter = DS.DjangoTastypieAdapter.extend({
    serverDomain: "http://yourDomain.com",
    namespace: "api/v1"
});
```

##### Using in Ember-CLI as a  global module:

1. Add an import statement to your **brocfile.js**.
    ```javascript
    app.import('vendor/ember-data-tastypie-adapter/dist/global/ember-data-tastypie-adapter.js');
    ```
2. Add an 2 entries to the **predef** section of your **.jshintrc** file.
    ```javascript
        "DjangoTastypieAdapter": true,
        "DjangoTastypieSerializer": true
    ```
3. Setup app/adapters/application.js for usage with the tastypie adapter.
    ```javascript
    import DS from "ember-data";

    export default DS.DjangoTastypieAdapter.extend();
    ```
4. Setup app/serializers/application.js for usage with the tastypie serializer.
    ```javascript
    import DS from "ember-data";

    export default DS.DjangoTastypieSerializer.extend();
    ```

**Note:** You can also add any paramaters available in the default RESTAdapter and RESTSerializer in ember. See http://emberjs.com/api/data/classes/DS.RESTAdapter.html and http://emberjs.com/api/data/classes/DS.RESTSerializer.html fur full configuration details. An example is shown below.
```javascript
import DS from "ember-data";

export default DS.DjangoTastypieAdapter.extend({
    serverDomain: "http://yourDomain.com",
    namespace: "api/v1"
});
```

#### *Python/Django side*
The standard django-tastypie configuration will do the work. However, some details are important:

1. ember-data always expects data in return (except in deletions). Make sure to configure your Resources with the meta option if you are going to perform POST or PUT operations:
    ```python
    class Meta:
        always_return_data = True
    ```
2. obviously, the permissions must be configured in the server to allow GET, POST, PUT and DELETE methods to provide fully access to CRUD operations. Usually, django-tastypie will require an Authorization meta option to allow writing
    ```python
    class Meta:
        authorization = Authorization()
        detail_allowed_methods = ['get', 'post', 'put', 'delete']
        always_return_data = True
    ```

#### Ember-data relationship fields
Ember-data (and this adapter) supports two kind of relationship fields: `hasMany` and `belongsTo`. There are two methods of handling relationship fields with tastypie:

- Async Resources
    - The related data is not present in the response of the parent model, so ember-data uses promise objects to represent such fields
    - Related data is fetched asynchronously, when the code tries to access the field of the model
    - This adaptor expects tastypie to return only related resource urls in the response, so:
        - Tastypie resources **must not** use `full=True` in the relationship fields
        - Ember-data model should define the relationship with `async: true` option
    - Example model definition:
    ```javascript
    App.Comment = DS.Model.extend({
        text: attr("string")
    })

    App.Post = DS.Model.extend({
        text: attr("string"),
        comments: hasMany("comment", {async: true})
    })
    ```

- Embedded Resources
    - The related model's data is embedded in the response of the parent model, so there is no need to fetch the related model using its own resource uri
    - This adaptor expects tastypie to return full data of related model in the same response:
        - Tastypie resources must use `full=True` in the relationship fields
        - Ember-data model should define the relationship without `async: true` option. async is false by default.
    - Example model definition
    ```javascript
    App.Comment = DS.Model.extend({
        text: attr("string")
    })

    App.Post = DS.Model.extend({
        text: attr("string"),
        comments: hasMany("comment")
    })
    ```

**Note:** In both the cases, (for now) it is mandatory for the related models to have their own URLs to support proper CRUD operations


## Contributing
This adapter may be useful for someone in the ember.js/django community. If you want to extend it, please open issues and send pull requests.

#### Bulk Commits note
This adapter does not support bulkCommits and does not plan to do it soon. django-tastypie REST implementation differs from the Ruby on Rails one, widely used by the ember.js community. Although bulkCommits can be implemented with PATCH operations, I didn't like the resulting adapter.


## Building
**Note**: To build minified .js files you need to have ** BROCCOLI_ENV="production" ** and ** EMBER_ENV="production" ** in your environment at build time.

Go to the project folder you downloaded the source to and type in:
```bash
npm install
bower install
broccoli build dist
```


## Unit tests

#### Browser
Go to the project directory and type:
```bash
testem
```
Go to http://localhost:7357/ to run the Qunit tests.

### Terminal (PhantomJS)
```bash
# Run once
testem ci
```

## Versions
In the meantime ember-data reachs 1.0, custom compilations have been used to test the adapter.

#### ember.js
1.8.1

#### ember-data
1.0.0-beta.11


## Contributors
- [Diego Muñoz Escalante](https://github.com/escalant3)
- [Pepe Cano](https://github.com/ppcano)
- [olofsj](https://github.com/olofsj)
- [Mitchel Kelonye](https://github.com/kelonye)
- [Dzmitry Dzemidzenka](https://github.com/ddemid)
- [Pedro Kiefer](https://github.com/pedrokiefer)
- [Alex Goodwin](https://github.com/go1dfish)
- [Aaron Ghent](https://github.com/AaronGhent)
- [Sander Steffann](https://github.com/steffann)
- [Sunny Nanda](https://github.com/snanda85)


## License
The MIT License (MIT)

Copyright (c) 2014 Diego Muñoz Escalante

