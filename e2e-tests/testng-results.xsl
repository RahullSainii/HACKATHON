<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">
<html>
<head>
    <title>TestNG XSLT Report</title>
    <style>
        body { font-family: Arial; }
        table { border-collapse: collapse; width: 80%; margin: 20px; }
        th, td { border: 1px solid black; padding: 8px; text-align: center; }
        th { background-color: #4CAF50; color: white; }
    </style>
</head>

<body>
    <h2>TestNG Results</h2>

    <table>
        <tr>
            <th>Total Tests</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Skipped</th>
        </tr>
        <tr>
            <td><xsl:value-of select="testng-results/@total"/></td>
            <td><xsl:value-of select="testng-results/@passed"/></td>
            <td><xsl:value-of select="testng-results/@failed"/></td>
            <td><xsl:value-of select="testng-results/@skipped"/></td>
        </tr>
    </table>
</body>
</html>
</xsl:template>

</xsl:stylesheet>
