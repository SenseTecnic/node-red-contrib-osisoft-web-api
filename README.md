# node-red-contrib-osisoft-web-api

These are [Node-RED](http://nodered.org) nodes that interface with the [OSISoft Web API server](https://techsupport.osisoft.com/Products/Developer-Technologies/PI-Web-API/Overviewcom/). The nodes simplify the process of developing an application to write data and to query data.

For more information of these nodes, tutorials will be available on [http://developers.sensetecnic.com](http://developers.sensetecnic.com/) soon.


## Pre-requesites

To run these nodes, you need to:

   * A running OSIsoft Pi Server
   * A running OSIsoft Pi Web API server associated with the Pi Server
   * The OSIsoft Pi Web API server will need to be configurated using "Basic" or "Anonymous" authentication methods. 
   * Pi identities with appropriate read/write access privileges are required to access to Pi server 
   * You can find more infomation on OSIsoft Pi Server [product page](https://techsupport.osisoft.com/Products/PI-Server). 

## Install

Run the follwing command in the root directory of your Node-RED install.
Usually this is `~/.node-red` .
```
    npm install node-red-contrib-osisoft-web-api
```

## Usage

### Web API write node: Write data to Pi Server

This is the node to write data to the Pi server. Currently, you can either write data to points in your data servers by Web ID, point paths, or you can write data to any other API endpoints with your own URL input.

  * By Web ID: Write to a point in data servers by using Web ID
  * By Point Path: Write to a point in data servers by using the point path. The node will first query the path, and write to that point using the Web ID returned from the query.
  * By Custom URL: Write data using a custom URL relative to the base Web API URL set in the configuration node. You can use this mode to write to anything that is not in the data servers.

An example flow writing to a specific Web ID:
```
[{"id":"96264f9e.af0bd","type":"web-api-write","z":"543e65ad.2f3a4c","name":"","server":"64727ec0.eb85f","writeMethod":"webId","webId":"P0RBbjFMMXuUivIEAgCXqPnADwAAAARUMyQU1BWi05SEVKVlRMXEtIT1VfUkVMQVRJVkVfSFVNSURJVFk","requestMethod":"POST","x":585,"y":381,"wires":[["19d58c27.3e2c84"]]},{"id":"5441511c.03566","type":"inject","z":"543e65ad.2f3a4c","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":258,"y":338,"wires":[["7b828585.10df2c"]]},{"id":"7b828585.10df2c","type":"function","z":"543e65ad.2f3a4c","name":"post value","func":"msg.payload = {\n    \"Value\":31.5\n}\nreturn msg;","outputs":1,"noerr":0,"x":425,"y":362,"wires":[["96264f9e.af0bd"]]},{"id":"19d58c27.3e2c84","type":"debug","z":"543e65ad.2f3a4c","name":"","active":true,"console":"false","complete":"true","x":771,"y":356,"wires":[]},{"id":"64727ec0.eb85f","type":"web-api-client","z":"","name":"","serverURL":"my-pi-server/piwebapi","authenticateMethod":"basic","usetls":true,"tls":"b50d2d8b.bbace"},{"id":"b50d2d8b.bbace","type":"tls-config","z":"","name":"","cert":"","key":"","ca":"","certname":"","keyname":"","caname":"","verifyservercert":false}]
```


>*Known Issues:* On some Web API server setups, you might see the node returns 500 error, but the value would be still updated on the Pi server. This might be related to your Pi Server configuration.

For more info on the write node, please refer to our upcoming tutorial on [http://developers.sensetecnic.com](http://developers.sensetecnic.com/)


### Web API query node: Query data from Pi Server

This is the node to query data from the Pi server. Currently, you can either query points from your Pi Data servers by Web ID, point paths, and preset features, or you can query any other data with your own URL input. 

  * By Web ID: Query a point in data servers by using Web ID
  * By Point path: Query a point in data servers by using the point path
  * By Custom URL: Query a custom URL relative to the base Web API URL set in the configuration node. You can use this mode to query anything that is not in the data servers

These are the preset features where you can:

  * List all Assert servers: List all the assert servers from your Pi server
  * List all DBs in Assert Servers: List all the databases from all assert servers
  * List all Data Servers: List all the data servers from the Pi Server
  * List all points in Data Servers: List all points from all data servers.

An example flow code querying a point with a specific Web ID:
  ```
  [{"id":"919a963f.186748","type":"web-api-query","z":"543e65ad.2f3a4c","name":"","server":"64727ec0.eb85f","queryMethod":"webId","webId":"P0RBbjFMMXuUivIEAgCXqPnADwAAAARUMyQU1BWi05SEVKVlRMXEtIT1VfUkVMQVRJVkVfSFVNSURJVFk","dataType":"self","customUrl":"","x":359,"y":173,"wires":[["8023a61c.a03078"]]},{"id":"a774c1cd.57ba9","type":"inject","z":"543e65ad.2f3a4c","name":"","topic":"","payload":"","payloadType":"date","repeat":"","crontab":"","once":false,"x":162,"y":164,"wires":[["919a963f.186748"]]},{"id":"8023a61c.a03078","type":"debug","z":"543e65ad.2f3a4c","name":"","active":true,"console":"false","complete":"true","x":529,"y":170,"wires":[]},{"id":"64727ec0.eb85f","type":"web-api-client","z":"","name":"","serverURL":"my-pi-server/piwebapi","authenticateMethod":"basic","usetls":true,"tls":"b50d2d8b.bbace"},{"id":"b50d2d8b.bbace","type":"tls-config","z":"","name":"","cert":"","key":"","ca":"","certname":"","keyname":"","caname":"","verifyservercert":false}]
  ```

For more info on the query node, please refer to our upcoming tutorial on [http://developers.sensetecnic.com](http://developers.sensetecnic.com/)


