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
const users = [{ id: 0, name: "Guest" }], messages = [], rolls = [];

// Initialize subscription service.
const pubsub = new PubSub();

// Construct the schema to define types.
const typeDefs = gql`
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
        createUser(name: String!): User!
        createMessage(userId: ID!, text: String!): Message!
        createRoll(userId: ID!, diceCount: Int!, diceFaces: Int!): Roll!
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
    },
    Mutation: {
        createUser: (parent, { name }) => {
            const id = users.length;
            const newUser = {
                id: id,
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
            const newRoll = {
                id: id,
                user: users.find(user => user.id == userId), // FIXME figure out why strict type equality doesn't work here.
                diceCount: diceCount,
                diceFaces: diceFaces,
                result: rollDice(diceCount, diceFaces),
            };
            rolls.push(newRoll);

            return newRoll;
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