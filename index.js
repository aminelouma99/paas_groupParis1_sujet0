const Joi =require('joi')
const Sequelize =require('sequelize')
const Hapi = require('hapi');
const Inert = require("inert");
const Vision = require("vision");
const HapiSwagger = require("hapi-swagger");
const port = process.env.PORT || 3000;
//const redis = require('./redis-client');
var redis = require('redis');
var client = redis.createClient(6379,'redis');

client.on('connect', function() {
    console.log('Redis client connected');
});

client.on('error', function (err) {
    console.log('Something went wrong ' + err);
});


const server = new Hapi.Server(
  {
    port
  }
);


(async () => {
  if (!process.env.POSTGRES_HOST) {
    throw Error(
      "process.env.POSTGRES_HOST must be a: user:pass@ipService:port ",
    );
  }
  const sequelize = new Sequelize(
    `postgres://${process.env.POSTGRES_HOST}/${process.env.POSTGRES_DB || "paas-project"}`,
    {
      ssl: process.env.POSTGRES_SSL,
      dialectOptions: {
        ssl: process.env.POSTGRES_SSL,
      }, 
    }
  );
  let retries = 5;
  
  while(retries){
    try {
      await sequelize.authenticate();
      console.log("postgres is running");
      break;
    } catch (error) {
      console.log(error);
      retries -= 1;
      console.log( `retries left: ${retries}`);
    }
  }
  if(retries==0){
    await new Promise(res => setTimeout(res,5000));
  }
  let rediStatus = 'Available';
  client.on('error', function (err) {
    rediStatus = 'Not available';
    console.log('Something went wrong ' + err);
  
  });

  const Messages = sequelize.define("messages", {
    message: Sequelize.STRING
  });

  await Messages.sync({ force: true });

  await server.register([
    Inert,
    Vision,
    {
      plugin: HapiSwagger,
      options: {
        info: {
          title: "Paas-Project groupParis1",
          version: "1.0",
      },
      }
  },
  ]);

  server.route([
    {
      method: "GET",
      path: "/",
      handler: () => {
        return Messages.findAll();
      },
      config: {
        description: "List All messages",
        notes: "messages from database",
        tags: ["api"],
      },
    },
    /*{
      method: "GET",
      path: "/status",
      handler: async (request, h) => {
        let {sub: redispath} = request.auth.credentials;
        let {item: redisvalue} = request.payload;
        let {redis} = request.server.app;
    
        try {
    
          let count = await redis.lpushAsync(redispath, redisvalue);
    
          return h.response({
            count
          }).code(201);
    
        } catch (e) {
          return Boom.badImplementation(e);
        }
      }
    },*/
    {
      method: "POST",
      path: "/message",
      config: {
        handler: (req) => {
          const { payload } = req;
          return Messages.create(payload);
        },
        description: "Create a message",
        notes: "create a message",
        tags: ["api"],
        validate: {
          payload: {
            message: Joi.string().required(),
          },
        },
      },
    },
    {
      method: "POST",
      path: "/status",
      config: {
        handler: (req) => {
          const { payload } = req;
          console.log('debug');
          r = await client.get('nbcall', function (error, nbCall) {
            if (error) {
                console.log(error);
                throw error;
            }
            console.log('ok')
            //client.set('nbcall', nbCall + 1, 
            return {}; 
          });
          return r;
        },
        description: "Create a message",
        notes: "create a message",
        tags: ["api"],
        validate: {
          payload: {
            message: Joi.string().required(),
          },
        },
      },
    },
    {
      method: "DELETE",
      path: "/message/{id}",
      config: {
        handler: (req) => {
          return Messages.destroy({ where: { id: req.params.id } });
        },
        description: "Delete a message",
        notes: "Delete a message",
        tags: ["api"],
        validate: {
          params: {
            id: Joi.string().required(),
          },
        },
      },
    },
  ]);

  await server.start();
  console.log("server running at", server.info.port);
})();
