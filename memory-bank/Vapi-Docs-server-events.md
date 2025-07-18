# Server events

> Learn about different events that can be sent to a Server URL.

All messages sent to your Server URL will be `POST` requests with the following body:

```json
{
  "message": {
    "type": "function-call",
    "call": { Call Object },
    ...other message properties
  }
}
```

They include the type of message, the call object, and any other properties that are relevant to the message type. Below are the different types of messages that can be sent to your Server URL.

### Function Calling

<Info>
  Vapi fully supports [OpenAI's function calling
  API](https://platform.openai.com/docs/guides/gpt/function-calling), so you can have assistants
  ping your server to perform actions like sending emails, retrieve information, and more.
</Info>

With each response, the assistant will automatically determine what functions to call based on the directions provided in the system message in `messages`. Here's an example of what the assistant might look like:

```json
{
  "name": "Ryan's Assistant",
  "model": {
    "provider": "openai",
    "model": "gpt-4o",
    "functions": [
      {
        "name": "sendEmail",
        "description": "Used to send an email to a client.",
        "parameters": {
          "type": "object",
          "properties": {
            "color": { "type": "string" }
          }
        }
      }
    ]
  }
}
```

Once a function is triggered, the assistant will send a message to your Server URL with the following body:

```json
{
  "message": {
    "type": "function-call",
    "call": { Call Object },
    "functionCall": {
      "name": "sendEmail",
      "parameters": "{ \"emailAddress\": \"john@example.com\"}"
    }
  }
}
```

Your server should respond with a JSON object containing the function's response, like so:

```json
{ "result": "Your email has been sent." }
```

Or if it's an object:

```json
{
  "result": "{ \"message\": \"Your email has been sent.\", \"email\": \"test@email.com\" }"
}
```

The result will be appended to the conversation, and the assistant will decide what to do with the response based on its system prompt.

<Note>
  If you don't need to return a response, you can use the `async: true` parameter in your assitant's
  function configuration. This will prevent the assistant from waiting for a response from your
  server.
</Note>

### Retrieving Assistants

For inbound phone calls, you may want to specify the assistant based on the caller's phone number. If a PhoneNumber doesn't have an `assistantId`, Vapi will attempt to retrieve the assistant from your server.

```json
{
  "message": {
    "type": "assistant-request",
    "call": { Call Object },
  }
}
```

If you want to use an existing saved assistant instead of creating a transient assistant for each request, you can respond with the assistant's ID:

```json
{
  "assistantId": "your-saved-assistant-id"
}
```

Alternatively, if you prefer to define a transient assistant dynamically, your server should respond with the [assistant](/api-reference/webhooks/server-message#response.body.messageResponse.Server%20Message%20Response%20Assistant%20Request.assistant) object directly:

```json
{
  "assistant": {
    "firstMessage": "Hey Ryan, how are you?",
    "model": {
      "provider": "openai",
      "model": "gpt-4o",
      "messages": [
        {
          "role": "system",
          "content": "You're Ryan's assistant..."
        }
      ]
    }
  }
}
```

If you'd like to play an error message instead, you can respond with:

```json
{ "error": "Sorry, not enough credits on your account, please refill." }
```

### Call Status Updates

During the call, the assistant will make multiple `POST` requests to the Server URL with the following body:

```json
{
  "message": {
    "type": "status-update",
    "call": { Call Object },
    "status": "ended",
  }
}
```

<Card title="Status Events">
  * `in-progress`: The call has started. - `forwarding`: The call is about to be forwarded to
    `forwardingPhoneNumber`. - `ended`: The call has ended.
</Card>

### End of Call Report

When a call ends, the assistant will make a `POST` request to the Server URL with the following body:

```json
{
  "message": {
    "type": "end-of-call-report",
    "endedReason": "hangup",
    "call": { Call Object },
    "recordingUrl": "https://vapi-public.s3.amazonaws.com/recordings/1234.wav",
    "summary": "The user picked up the phone then asked about the weather...",
    "transcript": "AI: How can I help? User: What's the weather? ...",
    "messages":[
      {
        "role": "assistant",
        "message": "How can I help?",
      },
      {
        "role": "user",
        "message": "What's the weather?"
      },
      ...
    ]
  }
}
```

`endedReason` can be any of the options defined on the [Call Object](/api-reference/calls/get-call).

### Hang Notifications

Whenever the assistant fails to respond for 5+ seconds, the assistant will make a `POST` requests to the Server URL with the following body:

```json
{
  "message": {
    "type": "hang",
    "call": { Call Object },
  }
}
```

You can use this to display an error message to the user, or to send a notification to your team.
