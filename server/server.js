const express = require('express');
const cors = require('cors');
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
        createUser(name: String): User!
        createMessage(userId: ID!, text: String!): Message!
        createRoll(userId: ID!, diceCount: Int!, diceFaces: Int!): Roll!
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
        const newUser = {
            id: id,
            name: name ? name : `User ${id}`,
        }
        users.push(newUser);

        return newUser;
    },
    createMessage: ({userId, text}) => {
        const id = messages.length; // TODO update ID assignment if deletion functionality is added.
        const newMessage = {
            id: id,
            user: users.find(user => user.id == userId), // FIXME figure out why strict type equality doesn't work here.
            text: text,
        };
        messages.push(newMessage);

        return newMessage;
    },
    createRoll: ({userId, diceCount, diceFaces}) => {
        const id = rolls.length; // TODO update ID assignment if deletion functionality is added.
        const newRoll = {
            id: id,
            user: users.find(user => user.id == userId), // FIXME figure out why strict type equality doesn't work here.
            diceCount: diceCount,
            diceFaces: diceFaces,
            result: rollDice(diceCount, diceFaces),
        };
        rolls.push(newRoll);

        return newRoll;
    }
};

// Start up the server.
var app = express();
app.use(cors());
app.use(express.json());
app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true, // Enables the graphical UI for quick testing.
}));
app.listen(4000);
console.log('Running a GraphQL API server at http://localhost:4000/graphql');