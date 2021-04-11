const { ApolloServer, gql, PubSub } = require('apollo-server');

// Helper function for dice rolling.
function rollDice(diceCount, diceFaces) {
    let total = 0;

    for (let i = 0; i < diceCount; i++) {
        total += Math.floor(Math.random() * (diceFaces - 1)) + 1;
    }

    return total;
}

// Initialize users and messages.
const users = [{ id: 0, createdAt: 0, name: "Guest" }], messages = [], rolls = [];

// Initialize subscription service.
const pubsub = new PubSub();

// Construct the schema to define types.
const typeDefs = gql`
    type User {
        id: ID!
        createdAt: Int!
        name: String!
    }

    type Message {
        id: ID!
        createdAt: Int!
        user: User!
        text: String!
        roll: Roll
    }

    type Roll {
        id: ID!
        createdAt: Int!
        user: User!
        diceCount: Int!
        diceFaces: Int!
        result: Int!
    }

    type Query {
        users: [User]
        messages: [Message]
        rolls: [Roll]
        messagesAndRolls: [Message]
    }

    type Mutation {
        createUser(name: String!): User!
        createMessage(userId: ID!, text: String!): Message!
        createRoll(userId: ID!, diceCount: Int!, diceFaces: Int!): Roll!
        verifyUser(id: ID!, name: String!): Boolean
    }

    type Subscription {
        userCreated: User!
        messageCreated: Message!
    }
`;

// Construct the root to provide resolvers for API endpoints.
const resolvers = {
    Query: {
        users: () => {
            return users;
        },
        messages: () => {
            return messages;
        },
        rolls: () => {
            return rolls;
        },
        messagesAndRolls: () => {
            // Merge messages and rolls into a unified format.
            const rollsAsMessages = rolls.map(roll => {  })
        }
    },
    Mutation: {
        createUser: (parent, { name }) => {
            const id = users.length;
            const newUser = {
                id: id,
                createdAt: Math.round((new Date()).getTime() / 1000),
                name: name ? name : `User ${id}`,
            }
            users.push(newUser);

            pubsub.publish('USER_CREATED', {
                userCreated: newUser,
            });

            return newUser;
        },
        createMessage: (parent, {userId, text}) => {
            const id = messages.length;
            const newMessage = {
                id: id,
                createdAt: Math.round((new Date()).getTime() / 1000),
                user: users.find(user => user.id == userId), // FIXME figure out why strict type equality doesn't work here.
                text: text,
            };
            messages.push(newMessage);

            pubsub.publish('MESSAGE_CREATED', {
                messageCreated: newMessage,
            });

            return newMessage;
        },
        createRoll: (parent, {userId, diceCount, diceFaces}) => {
            const id = rolls.length;

            // Add to rolls.
            const newRoll = {
                id: id,
                createdAt: Math.round((new Date()).getTime() / 1000),
                user: users.find(user => user.id == userId), // FIXME figure out why strict type equality doesn't work here.
                diceCount: diceCount,
                diceFaces: diceFaces,
                result: rollDice(diceCount, diceFaces),
            };
            rolls.push(newRoll);

            // Also add to messages.
            const messageId = messages.length;
            const newMessage = {
                id: messageId,
                createdAt: newRoll.createdAt,
                user: newRoll.user, // FIXME figure out why strict type equality doesn't work here.
                text: '',
                roll: newRoll,
            };
            messages.push(newMessage);

            pubsub.publish('MESSAGE_CREATED', {
                messageCreated: newMessage,
            });

            return newRoll;
        },
        verifyUser: (parent, { id, name }) => {
            if (users.find(user => user.id == id && user.name == name)) {
                return true;
            } else {
                return false;
            }
        },
    },
    Subscription: {
        userCreated: {
            subscribe: () => pubsub.asyncIterator(['USER_CREATED'])
        },
        messageCreated: {
            subscribe: () => pubsub.asyncIterator(['MESSAGE_CREATED'])
        }
    },
};

// Start up the server.
const server = new ApolloServer({
    typeDefs,
    resolvers, 
    subscriptions: {
        path: '/subscriptions',
    },
});
server.listen().then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
});