const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');

// Helper function for dice rolling.
function rollDice(diceCount, diceFaces) {
    let total = 0;

    for (let i = 0; i < diceCount; i++) {
        total += Math.floor(Math.random() * (diceFaces - 1)) + 1;
    }

    return total;
}

// Initialize users and messages.
const users = [], messages = [], rolls = [];

// Construct the schema to define types.
const schema = buildSchema(`
    type User {
        id: ID!
        name: String!
    }

    type Message {
        id: ID!
        user: User!
        text: String!
    }

    type Roll {
        id: ID!
        user: User!
        diceCount: Int!
        diceFaces: Int!
        result: Int!
    }

    type Query {
        users: [User]
        messages: [Message]
        rolls: [Roll]
    }

    type Mutation {
        createUser(name: String!): ID!
        createMessage(userId: ID!, text: String!): ID!
        createRoll(userId: ID!, diceCount: Int!, diceFaces: Int!): ID!
    }
`);

// Construct the root to provide resolvers for API endpoints.
const root = {
    users: () => {
        return users;
    },
    messages: () => {
        return messages;
    },
    rolls: () => {
        return rolls;
    },
    createUser: ({name}) => {
        const id = users.length; // TODO update ID assignment if deletion functionality is added.
        users.push({
            id: id,
            name: name,
        });

        return id;
    },
    createMessage: ({userId, text}) => {
        const id = messages.length; // TODO update ID assignment if deletion functionality is added.
        messages.push({
            id: id,
            user: users.find(user => user.id == userId), // FIXME figure out why strict type equality doesn't work here.
            text: text,
        });

        return id;
    },
    createRoll: ({userId, diceCount, diceFaces}) => {
        const id = rolls.length; // TODO update ID assignment if deletion functionality is added.
        rolls.push({
            id: id,
            user: users.find(user => user.id == userId), // FIXME figure out why strict type equality doesn't work here.
            diceCount: diceCount,
            diceFaces: diceFaces,
            result: rollDice(diceCount, diceFaces),
        });

        return id;
    }
};

// Start up the server.
var app = express();
app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true, // Enables the graphical UI for quick testing.
}));
app.listen(4000);
console.log('Running a GraphQL API server at http://localhost:4000/graphql');