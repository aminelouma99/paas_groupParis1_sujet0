const Joi =require('joi')
const Sequelize =require('sequelize')
const Hapi = require('hapi');
const Inert = require("inert");
const Vision = require("vision");
const HapiSwagger = require("hapi-swagger");
const port = process.env.PORT || 3000;
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
  while(true){
    try {
      await sequelize.authenticate();
      console.log("postgres is running");
      break;
    } catch (error) {
      console.log(error);
      retries -= 1;
      console.log( `retries left: ${retries}`);
      await new Promise(res => setTimeout(res,5000));
    }
  }
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
