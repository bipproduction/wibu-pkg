# WIBU PKG

- WibuRealtime


### One Time Init

```ts
 WibuRealtime.init({
      onData: (data: any) => {
        console.log(data);
      },
      project: "test",
      WIBU_REALTIME_TOKEN: NEXT_PUBLIC_WIBU_REALTIME_TOKEN
    });
```


### SendData

```ts
WibuRealtime.setData({
            name: "wibu",
            age: 10
          });
```