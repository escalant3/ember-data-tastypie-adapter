# ember-data-tastypie-adapter [![Build Status](https://secure.travis-ci.org/escalant3/ember-data-tastypie-adapter.png?branch=master)](https://travis-ci.org/escalant3/ember-data-tastypie-adapter)


## Motivation
- django-tastypie is one of the most widely used libraries to provide a REST interface from a django App.
- The ember-data default RESTAdapter does not follow the conventions used in django-tastypie.
- Instead of forcing the django developer to adapt tastypie to ember-data conventions, this adapter does the dirty work.


## Usage

#### Javascript side

- You can either:
  - import the lib/tastypie_serializer.js and lib/tastypie_adapter.js files, or
  - use the ember-data-tastypie-adapter package on your build process.
  or
  - use dist/tastypie_adapter.js after running `bundle && bundle exec rakep build` or simply `rake dist`

- To use the adapter with your store:

Basic code to use the adapter:

      App.ApplicationAdapter = DS.DjangoTastypieAdapter.extend({});
      App.ApplicationSerializer = DS.DjangoTastypieSerializer.extend({});


Creating with several parameters:

      App.ApplicationAdapter = DS.DjangoTastypieAdapter.extend({
        serverDomain: "http://yourDomain.com",
        namespace: "api/v1"
      });


#### python/django side
The standard django-tastypie configuration will do the work. However, some details are important:

i) ember-data always expects data in return (except in deletions). Make sure to configure your Resources with the meta option if you are going to perform POST or PUT operations:


    class Meta:
        always_return_data = True


ii) obviously, the permissions must be configured in the server to allow GET, POST, PUT and DELETE methods to provide fully access to CRUD operations. Usually, django-tastypie will require an Authorization meta option to allow writing

    class Meta:
        authorization = Authorization()
        detail_allowed_methods = ['get', 'post', 'put', 'delete']
        always_return_data = True



## Contributing
This adapter may be useful for someone in the ember.js/django community. If you want to extend it, please open issues and send pull requests.

#### Bulk Commits note
This adapter does not support bulkCommits and does not plan to do it soon. django-tastypie REST implementation differs from the Ruby on Rails one, widely used by the ember.js community. Although bulkCommits can be implemented with PATCH operations, I didn't like the resulting adapter.

## Unit tests

### Browser
Go to the tests directory and type:

    python -m SimpleHTTPServer

Go to http://localhost:8000/tests/ to run the Qunit tests.

### Terminal (PhantomJS)

    # Run once
    rake test

    # Run continuosly listening for changes (OS X only)
    rake autotest

## Versions
In the meantime ember-data reachs 1.0, custom compilations have been used to test the adapter.

#### ember.js
1.4.0

#### ember-data
1.0.0-beta.7


## Contributors
- [Diego Muñoz Escalante](https://github.com/escalant3)
- [Pepe Cano](https://github.com/ppcano)
- [olofsj](https://github.com/olofsj)
- [Mitchel Kelonye](https://github.com/kelonye)
- [Dzmitry Dzemidzenka](https://github.com/ddemid)
- [Pedro Kiefer](https://github.com/pedrokiefer)
- [Alex Goodwin](https://github.com/go1dfish)
- [Aaron Ghent](https://github.com/AaronGhent)


## License
The MIT License (MIT)

Copyright (c) 2014 Diego Muñoz Escalante

