#!/usr/bin/env python3

import typer
import os
import requests

app = typer.Typer()

@app.command()
def ping():
    try:
        url = "http://" + str(os.environ['API_HOST_TEST']) + "/"
        print(url)
        response = requests.get(url)
        print(response.content)
    except KeyError:
        print("variable not set")

@app.command()
def merge(seq): 
    try:
        url = "http://" + str(os.environ['API_HOST_TEST']) + "/api/v1/action/merge"
        print(url)
        try:
            response = requests.post(url,json={"name":seq})
            print(response.content)
        except requests.exceptions.RequestException as e:  # This is the correct syntax
            print("An error occurred performing request")
            print(e)
    except KeyError:
        print("variable not set")

@app.command()
def invoke(action,params): 
    try:
        url = None
        if(params == None):
            url = "http://" + str(os.environ['API_HOST_TEST']) + "/api/v1/action/invoke"
        else:
            url = "http://" + str(os.environ['API_HOST_TEST']) + "/api/v1/action/invoke-with-params"
        try:
            response = requests.post(url,json={"name":action ,"params":params})
            print(response.content)
        except requests.exceptions.RequestException as e:  # This is the correct syntax
            print("An error occurred performing request")
            raise SystemExit(e)
    except KeyError:
        print("variable not set")

@app.command()
def get(action): 
    try:

        url = "http://" + str(os.environ['API_HOST_TEST']) + "/api/v1/action/get"
        try:
            response = requests.post(url,json={"name":action})
            print(response.content)
        except requests.exceptions.RequestException as e:  # This is the correct syntax
            print("An error occurred performing request")
            raise SystemExit(e)
    except KeyError:
        print("variable not set")

@app.command()
def list(): 
    try:

        url = "http://" + str(os.environ['API_HOST_TEST']) + "/api/v1/action/list"
        try:
            response = requests.post(url)
            print(response.content)
        except requests.exceptions.RequestException as e:  # This is the correct syntax
            print("An error occurred performing request")
            raise SystemExit(e)
    except KeyError:
        print("variable not set")


@app.command()
def metrics(action,period):
    try:
        url = "http://" + str(os.environ['API_HOST_TEST']) + "/api/v1/metrics/get"
        print(url)
        try:
            response = requests.post(url,json={"name":action,"period":period})
            print(response.content)
        except requests.exceptions.RequestException as e:  # This is the correct syntax
            print("An error occurred performing request")
            raise SystemExit(e)
    except KeyError:
        print("variable not set")

@app.command()
def optimize(sequence,period):
    try:
        url = "http://" + str(os.environ['API_HOST_TEST']) + "/api/v1/action/optimize"
        print(url)
        try:
            response = requests.post(url,json={"name":sequence,"period":period})
            print(response.content)
        except requests.exceptions.RequestException as e:  # This is the correct syntax
            print("An error occurred performing request")
            raise SystemExit(e)
    except KeyError:
        print("variable not set")

if __name__ == "__main__":
    app()



