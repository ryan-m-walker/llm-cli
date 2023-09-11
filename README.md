# LLM-CLI

A simple LLM chat wrapper for those of us who live in the terminal.

## Installation

``` bash
$ npm i -g llm-cli
```

## Basic Usage

To start you'll first want to add your LLM API key (right now only OpenAI is supported):

``` bash
$ llm config set --apiKey <YOUR OPENAI API KEY>
```

To start a new chat conversation:

``` bash
$ llm chat
```

See all options:

``` bash
$ llm help
```

