API Backend: Node.js
API Communication: GraphQL
Application Frontend: React.js

React.js <--- GraphQL ---> Node.js

## Layout
Looks like the average group text/chat app.
User messages are displayed in timestamp order, so there aren't inconsistencies between users.

```
--------------------------------------
|     ~ Welcome to dice roller ~     |
--------------------------------------
| [Avatar] Message                   |
|                                    |
| [Avatar] Message                   |
|                                    |
| [Avatar] Longer message            |
|                                    |
| [Avatar] Much longer message wraps |
| around to the next line            |
|                                    |
| [Avatar] User rolled 1d20 -> 15    |
|                                    |
| [Avatar] Message from self gets    |
| highlighted                        |
|                                    |
|------------------------------------|
|  d100  d20  d12  d10  d8  d6  d4   |
| ---------------------------------| |
| | Enter message...  |  Send  >>> | |
| ---------------------------------- |
| ---------------------------------- |
| | Name              | Update >>> | |
| ---------------------------------- |
--------------------------------------
```

# Behavior
- Enter text in name box, and press return or click update => send API request to change name
- Click die => send API request to roll XdY and post result
- Enter text in message box, and press return or click send => send API request to post message

# API
- Send name to server. Update User model.
- Send message to server. Create Message model. Broadcast new Message.
- Send request to server to roll XdY. Create Roll model. Broadcast new Roll.

# Models
User:
	id: Integer
	name: String

Message:
	id: Integer
	timestamp: DateTime
	user: User

Roll:
	id: Integer
	timestamp: DateTime
	syntax: String
	result: Array<Integer> (some rolls result in a single number e.g. 1d20, others result in multiple e.g. 2d20)